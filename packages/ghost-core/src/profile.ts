import { resolve } from "node:path";
import { resolveTarget } from "./config.js";
import { emitFingerprint } from "./evolution/emit.js";
import { appendHistory } from "./evolution/history.js";
import { extract } from "./extractors/index.js";
import { computeSemanticEmbedding } from "./fingerprint/embed-api.js";
import { computeEmbedding } from "./fingerprint/embedding.js";
import { fingerprintFromRegistry } from "./fingerprint/from-registry.js";
import type { StructuralAnalysis } from "./llm/analyze-structure.js";
import { analyzeStructure } from "./llm/analyze-structure.js";
import { createProvider } from "./llm/index.js";
import type { FingerprintValidation } from "./llm/validate-fingerprint.js";
import { validateFingerprint } from "./llm/validate-fingerprint.js";
import { resolveRegistry } from "./resolvers/registry.js";
import type {
  DesignFingerprint,
  EmbeddingConfig,
  EnrichedFingerprint,
  ExtractedMaterial,
  GhostConfig,
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
    // Convert ExtractedMaterial → SampledMaterial for the provider
    const sampled = {
      files: [
        ...material.styleFiles.map((f) => ({
          path: f.path,
          content: f.content,
          reason: "Style file",
        })),
        ...material.configFiles.map((f) => ({
          path: f.path,
          content: f.content,
          reason: "Config file",
        })),
        ...material.componentFiles.slice(0, 5).map((f) => ({
          path: f.path,
          content: f.content,
          reason: "Component file",
        })),
      ],
      metadata: {
        totalFiles:
          material.styleFiles.length +
          material.configFiles.length +
          material.componentFiles.length,
        sampledFiles: 0,
        targetType: "path" as const,
      },
    };
    sampled.metadata.sampledFiles = sampled.files.length;
    fingerprint = await provider.interpret(sampled, projectId);
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
 * Profile any target using the LLM-first agent pipeline.
 *
 * This is the primary entry point for Ghost v2.
 * Accepts a Target object or a string (auto-resolved via resolveTarget).
 *
 * Uses the Claude Agent SDK — the agent explores the filesystem directly
 * with Read/Glob/Grep tools to find and extract the visual language.
 */
export async function profileTarget(
  targetOrString: Target | string,
  config?: GhostConfig,
): Promise<ProfileTargetResult> {
  const { runFingerprintAgent } = await import("./agents/fingerprint-agent.js");

  const target =
    typeof targetOrString === "string"
      ? resolveTarget(targetOrString)
      : targetOrString;

  if (target.type !== "path") {
    throw new Error(
      `Agent SDK profiling only supports local paths (got ${target.type})`,
    );
  }

  const targetDir = resolve(process.cwd(), target.value);
  const projectId = target.name ?? target.value.split("/").pop() ?? "project";

  const result = await runFingerprintAgent({
    targetDir,
    targetType: target.type,
    projectId,
    verbose: config?.agents?.verbose ?? true,
    embedding: config?.embedding,
  });

  return {
    fingerprint: result.data,
    confidence: result.confidence,
    reasoning: result.reasoning,
    warnings: result.warnings,
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
  const _componentCount = material.metadata.componentCount;

  // Rough tokenization estimate: ratio of tokens to total style declarations
  let totalDeclarations = 0;
  for (const file of material.styleFiles) {
    const matches = file.content.match(/[a-z-]+\s*:/g);
    if (matches) totalDeclarations += matches.length;
  }
  const _tokenization =
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
  };

  const fingerprint: DesignFingerprint = {
    ...partial,
    embedding: computeEmbedding(partial),
  };

  // Upgrade to semantic embedding if configured
  fingerprint.embedding = await embedFingerprint(fingerprint, embeddingConfig);

  return fingerprint;
}
