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
  DesignFingerprint,
  EmbeddingConfig,
  ExtractedMaterial,
  GhostConfig,
} from "./types.js";

export interface ProfileOptions {
  cwd?: string;
  emit?: boolean;
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
 * If LLM config is present, uses LLM to interpret the extracted material,
 * then runs structural analysis and fingerprint validation as enrichment.
 *
 * Otherwise, attempts a deterministic fingerprint from CSS tokens.
 * Deterministic validation still runs (no LLM needed for that).
 *
 * If embedding config is present, uses an embedding API for the vector.
 * Otherwise, falls back to a deterministic 64-dim feature vector.
 *
 * Returns DesignFingerprint for backward compatibility.
 * Use profileWithAnalysis() for the enriched result with validation and structural analysis.
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
 *
 * Returns the fingerprint along with:
 * - validation: confidence score, issues, and suggestions (always runs, deterministic)
 * - structuralAnalysis: composition patterns, grid detection, visual hierarchy
 *   (runs when LLM config is present, falls back to deterministic detection)
 */
export async function profileWithAnalysis(
  config: GhostConfig,
  cwdOrOptions: string | ProfileOptions = {},
): Promise<ProfileResult> {
  const opts =
    typeof cwdOrOptions === "string" ? { cwd: cwdOrOptions } : cwdOrOptions;
  const cwd = opts.cwd ?? process.cwd();

  const material = await extract(cwd, {
    ignore: config.ignore,
    extractorNames: config.extractors,
    componentDir: config.designSystems?.[0]?.componentDir,
    styleEntry: config.designSystems?.[0]?.styleEntry,
  });

  let fingerprint: DesignFingerprint;

  if (config.llm) {
    const provider = createProvider(config.llm);
    const projectId = config.designSystems?.[0]?.name ?? "project";
    fingerprint = await provider.interpret(material, projectId);
    fingerprint.embedding = await embedFingerprint(
      fingerprint,
      config.embedding,
    );
  } else if (config.designSystems?.[0]?.registry) {
    const registry = await resolveRegistry(config.designSystems[0].registry);
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
