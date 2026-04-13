import { Director } from "./agents/director.js";
import { resolveTarget } from "./config.js";
import { emitFingerprint } from "./evolution/emit.js";
import { appendHistory } from "./evolution/history.js";
import { extract } from "./extractors/index.js";
import { computeSemanticEmbedding } from "./fingerprint/embed-api.js";
import { computeEmbedding } from "./fingerprint/embedding.js";
import { fingerprintFromRegistry } from "./fingerprint/from-registry.js";
import { analyzeStructure } from "./llm/analyze-structure.js";
import type { StructuralAnalysis } from "./llm/analyze-structure.js";
import { createProvider } from "./llm/index.js";
import { validateFingerprint } from "./llm/validate-fingerprint.js";
import type { FingerprintValidation } from "./llm/validate-fingerprint.js";
import { resolveRegistry } from "./resolvers/registry.js";
import type {
  AgentContext,
  AgentResult,
  DesignFingerprint,
  EmbeddingConfig,
  EnrichedFingerprint,
  ExtractedMaterial,
  GhostConfig,
  LLMConfig,
  Target,
} from "./types.js";

export interface ProfileOptions {
  cwd?: string;
  emit?: boolean;
  registry?: string;
}

export interface ProfileTargetResult {
  fingerprint: EnrichedFingerprint;
  confidence: number;
  reasoning: string[];
  warnings: string[];
}

export interface ProfileResult {
  fingerprint: DesignFingerprint;
  validation?: FingerprintValidation;
  structuralAnalysis?: StructuralAnalysis;
}

/**
 * Compute the embedding for a fingerprint.
 * Uses semantic embedding API if configured, otherwise falls back to deterministic.
 */
async function embedFingerprint(
  fingerprint: DesignFingerprint,
  embeddingConfig?: EmbeddingConfig,
): Promise<number[]> {
  if (embeddingConfig) {
    return computeSemanticEmbedding(fingerprint, embeddingConfig);
  }
  return computeEmbedding(fingerprint);
}

/**
 * Profile a repository — extract design material and produce a fingerprint.
 *
 * Works in zero-config mode: just pass a config (defaults are fine) and a cwd.
 *
 * If LLM config is present, uses LLM to interpret the extracted material.
 * Otherwise, attempts a deterministic fingerprint from CSS tokens.
 *
 * Returns DesignFingerprint for backward compatibility.
 * Use profileWithAnalysis() for the enriched result.
 */
export async function profile(
  config: GhostConfig,
  cwdOrOptions: string | ProfileOptions = {},
): Promise<DesignFingerprint> {
  const result = await profileWithAnalysis(config, cwdOrOptions);
  return result.fingerprint;
}

/**
 * Profile a repository with optional AI-powered enrichment.
 */
export async function profileWithAnalysis(
  config: GhostConfig,
  cwdOrOptions: string | ProfileOptions = {},
): Promise<ProfileResult> {
  const opts =
    typeof cwdOrOptions === "string" ? { cwd: cwdOrOptions } : cwdOrOptions;
  const cwd = opts.cwd ?? process.cwd();

  // Determine registry from options or first target
  const registryPath =
    opts.registry ??
    config.targets?.find((t) => t.type === "registry" || t.type === "url")
      ?.value;

  const material = await extract(cwd, {
    ignore: config.ignore,
    extractorNames: config.extractors,
  });

  let fingerprint: DesignFingerprint;

  if (config.llm) {
    const provider = createProvider(config.llm);
    const projectId = config.targets?.[0]?.name ?? "project";
    fingerprint = await provider.interpret(material, projectId);
    fingerprint.embedding = await embedFingerprint(
      fingerprint,
      config.embedding,
    );
  } else if (registryPath) {
    const registry = await resolveRegistry(registryPath);
    fingerprint = fingerprintFromRegistry(registry);
    fingerprint.embedding = await embedFingerprint(
      fingerprint,
      config.embedding,
    );
  } else {
    fingerprint = await fingerprintFromExtraction(material, config.embedding);
  }

  // Run enrichment: validation (always) and structural analysis (when LLM available)
  const validation = validateFingerprint(fingerprint, material, config.llm);

  let structuralAnalysis: StructuralAnalysis | undefined;
  if (config.llm) {
    const analysis = await analyzeStructure(material, fingerprint, config.llm);
    if (analysis) structuralAnalysis = analysis;
  }

  // Emit publishable fingerprint if requested
  if (opts.emit) {
    await emitFingerprint(fingerprint, cwd);
  }

  // Always append to history
  await appendHistory(
    {
      fingerprint,
      parentRef: config.parent,
    },
    cwd,
  );

  return { fingerprint, validation, structuralAnalysis };
}

/**
 * Profile a registry deterministically — no LLM needed.
 * Optionally uses embedding API if config provided.
 */
export async function profileRegistry(
  registryPath: string,
  embeddingConfig?: EmbeddingConfig,
): Promise<DesignFingerprint> {
  const registry = await resolveRegistry(registryPath);
  const fingerprint = fingerprintFromRegistry(registry);
  fingerprint.embedding = await embedFingerprint(fingerprint, embeddingConfig);
  return fingerprint;
}

/**
 * Profile any target using the agent pipeline.
 *
 * This is the primary entry point for Ghost v2.
 * Accepts a Target object or a string (auto-resolved via resolveTarget).
 * Config is optional — uses defaults if not provided.
 *
 * Uses Director → ExtractionAgent → FingerprintAgent pipeline.
 * Without LLM config, runs a single deterministic pass.
 * With LLM config, runs multi-turn enrichment with self-correction.
 */
export async function profileTarget(
  targetOrString: Target | string,
  config?: GhostConfig,
): Promise<ProfileTargetResult> {
  const target =
    typeof targetOrString === "string"
      ? resolveTarget(targetOrString)
      : targetOrString;

  const ctx: AgentContext = {
    llm: config?.llm ?? ({ provider: "anthropic" } as LLMConfig),
    embedding: config?.embedding,
    verbose: config?.agents?.verbose ?? false,
  };

  // If no LLM API key, run without LLM
  if (!config?.llm?.apiKey && !process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY) {
    ctx.llm = undefined as unknown as LLMConfig;
  }

  const director = new Director();
  const result = await director.profile(target, ctx);

  return {
    fingerprint: result.fingerprint.data,
    confidence: result.fingerprint.confidence,
    reasoning: [
      ...result.extraction.reasoning,
      ...result.fingerprint.reasoning,
    ],
    warnings: [
      ...result.extraction.warnings,
      ...result.fingerprint.warnings,
    ],
  };
}

/**
 * Build a basic fingerprint from extracted material without LLM.
 * Less accurate than LLM interpretation but works offline.
 */
async function fingerprintFromExtraction(
  material: ExtractedMaterial,
  embeddingConfig?: EmbeddingConfig,
): Promise<DesignFingerprint> {
  // Extract basic signals from CSS
  const tokenCount = material.metadata.tokenCount;
  const componentCount = material.metadata.componentCount;

  // Rough tokenization estimate: ratio of tokens to total style declarations
  let totalDeclarations = 0;
  for (const file of material.styleFiles) {
    const matches = file.content.match(/[a-z-]+\s*:/g);
    if (matches) totalDeclarations += matches.length;
  }
  const tokenization =
    totalDeclarations > 0 ? Math.min(tokenCount / totalDeclarations, 1) : 0;

  const partial: Omit<DesignFingerprint, "embedding"> = {
    id: "project",
    source: "extraction",
    timestamp: new Date().toISOString(),

    palette: {
      dominant: [],
      neutrals: { steps: [], count: 0 },
      semantic: [],
      saturationProfile: "mixed",
      contrast: "moderate",
    },

    spacing: {
      scale: [],
      regularity: 0,
      baseUnit: null,
    },

    typography: {
      families: [],
      sizeRamp: [],
      weightDistribution: {},
      lineHeightPattern: "normal",
    },

    surfaces: {
      borderRadii: [],
      shadowComplexity: "none",
      borderUsage: "minimal",
    },

    architecture: {
      tokenization,
      methodology: material.metadata.framework
        ? [material.metadata.framework]
        : [],
      componentCount,
      componentCategories: {},
      namingPattern: "unknown",
    },
  };

  const fingerprint: DesignFingerprint = {
    ...partial,
    embedding: computeEmbedding(partial),
  };

  // Upgrade to semantic embedding if configured
  fingerprint.embedding = await embedFingerprint(fingerprint, embeddingConfig);

  return fingerprint;
}
