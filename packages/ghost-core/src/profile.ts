import { extract } from "./extractors/index.js";
import { computeSemanticEmbedding } from "./fingerprint/embed-api.js";
import { computeEmbedding } from "./fingerprint/embedding.js";
import { fingerprintFromRegistry } from "./fingerprint/from-registry.js";
import { createProvider } from "./llm/index.js";
import { resolveRegistry } from "./resolvers/registry.js";
import type {
  DesignFingerprint,
  EmbeddingConfig,
  GhostConfig,
} from "./types.js";

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
 * If LLM config is present, uses LLM to interpret the extracted material.
 * Otherwise, attempts a deterministic fingerprint from CSS tokens.
 *
 * If embedding config is present, uses an embedding API for the vector.
 * Otherwise, falls back to a deterministic 64-dim feature vector.
 */
export async function profile(
  config: GhostConfig,
  cwd: string = process.cwd(),
): Promise<DesignFingerprint> {
  const material = await extract(cwd, {
    ignore: config.ignore,
    extractorNames: config.extractors,
    componentDir: config.designSystems?.[0]?.componentDir,
    styleEntry: config.designSystems?.[0]?.styleEntry,
  });

  if (config.llm) {
    const provider = createProvider(config.llm);
    const projectId = config.designSystems?.[0]?.name ?? "project";
    const fingerprint = await provider.interpret(material, projectId);

    fingerprint.embedding = await embedFingerprint(
      fingerprint,
      config.embedding,
    );

    return fingerprint;
  }

  // Deterministic fallback — if we have a registry, use it
  if (config.designSystems?.[0]?.registry) {
    const registry = await resolveRegistry(config.designSystems[0].registry);
    const fingerprint = fingerprintFromRegistry(registry);
    fingerprint.embedding = await embedFingerprint(
      fingerprint,
      config.embedding,
    );
    return fingerprint;
  }

  // Deterministic extraction-only fingerprint (limited but functional)
  return fingerprintFromExtraction(material, config.embedding);
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
  material: ReturnType<typeof extract> extends Promise<infer T> ? T : never,
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
