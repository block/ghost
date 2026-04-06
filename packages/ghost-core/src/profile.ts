import { extract } from "./extractors/index.js";
import { computeEmbedding } from "./fingerprint/embedding.js";
import { fingerprintFromRegistry } from "./fingerprint/from-registry.js";
import { createProvider } from "./llm/index.js";
import { resolveRegistry } from "./resolvers/registry.js";
import type { DesignFingerprint, GhostConfig } from "./types.js";

/**
 * Profile a repository — extract design material and produce a fingerprint.
 *
 * If LLM config is present, uses LLM to interpret the extracted material.
 * Otherwise, attempts a deterministic fingerprint from CSS tokens.
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

    // Always recompute embedding deterministically for comparability
    fingerprint.embedding = computeEmbedding(fingerprint);

    return fingerprint;
  }

  // Deterministic fallback — if we have a registry, use it
  if (config.designSystems?.[0]?.registry) {
    const registry = await resolveRegistry(config.designSystems[0].registry);
    return fingerprintFromRegistry(registry);
  }

  // Deterministic extraction-only fingerprint (limited but functional)
  return fingerprintFromExtraction(material, cwd);
}

/**
 * Profile a registry deterministically — no LLM needed.
 */
export async function profileRegistry(
  registryPath: string,
): Promise<DesignFingerprint> {
  const registry = await resolveRegistry(registryPath);
  return fingerprintFromRegistry(registry);
}

/**
 * Build a basic fingerprint from extracted material without LLM.
 * Less accurate than LLM interpretation but works offline.
 */
function fingerprintFromExtraction(
  material: ReturnType<typeof extract> extends Promise<infer T> ? T : never,
  _cwd: string,
): DesignFingerprint {
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

  const fingerprint: Omit<DesignFingerprint, "embedding"> = {
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

  return {
    ...fingerprint,
    embedding: computeEmbedding(fingerprint),
  };
}
