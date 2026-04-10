import type { DesignFingerprint } from "../types.js";

type FingerprintInput = Omit<DesignFingerprint, "embedding">;

// Fixed embedding size for comparability
const EMBEDDING_SIZE = 64;

/**
 * Compute a deterministic numeric embedding from a structured fingerprint.
 * This ensures fingerprints from different sources (LLM, registry, extraction)
 * produce comparable vectors.
 *
 * Dimensions (64 total):
 *  [0-11]   Palette: dominant colors OKLCH (up to 4 colors x 3 channels)
 *  [12-17]  Palette: neutral ramp features (count, has neutrals, ramp density, lightness min/max/range)
 *  [18-20]  Palette: qualitative (saturation profile, contrast, semantic count)
 *  [21-30]  Spacing: scale features (count, min, max, regularity, base unit, median, spread, step ratio, density, range ratio)
 *  [31-40]  Typography: families count, size ramp features, weight distribution, line height, weight spread, ramp range
 *  [41-48]  Surfaces: radii features, shadow complexity, border usage, radii spread, radii median, max radius
 *  [49-63]  Architecture: tokenization, component count, methodology, categories, category diversity entropy, component density
 */
export function computeEmbedding(fingerprint: FingerprintInput): number[] {
  const vec: number[] = new Array(EMBEDDING_SIZE).fill(0);
  let i = 0;

  // --- Palette: dominant colors (12 dims) ---
  const dominantSlots = 4;
  for (let s = 0; s < dominantSlots; s++) {
    const color = fingerprint.palette.dominant[s];
    if (color?.oklch) {
      vec[i++] = color.oklch[0]; // L (0-1)
      vec[i++] = color.oklch[1]; // C (0-0.4 typical)
      vec[i++] = color.oklch[2] / 360; // H normalized to 0-1
    } else {
      i += 3;
    }
  }

  // --- Palette: neutral ramp (6 dims) ---
  const neutralCount = fingerprint.palette.neutrals.count;
  vec[i++] = Math.min(neutralCount / 10, 1); // normalized count
  vec[i++] = neutralCount > 0 ? 1 : 0; // has neutrals
  vec[i++] = Math.min(neutralCount / 20, 1); // ramp density

  // Estimate lightness range from neutral steps using semantic colors as proxy
  const neutralLightnesses = fingerprint.palette.semantic
    .filter(
      (c) =>
        c.oklch &&
        (c.role.startsWith("surface") ||
          c.role.startsWith("text") ||
          c.role === "muted"),
    )
    .map((c) => c.oklch![0]);
  if (neutralLightnesses.length >= 2) {
    vec[i++] = Math.min(...neutralLightnesses); // min lightness
    vec[i++] = Math.max(...neutralLightnesses); // max lightness
    vec[i++] = Math.max(...neutralLightnesses) - Math.min(...neutralLightnesses); // lightness range
  } else {
    i += 3;
  }

  // --- Palette: qualitative (3 dims) ---
  vec[i++] =
    fingerprint.palette.saturationProfile === "vibrant"
      ? 1
      : fingerprint.palette.saturationProfile === "mixed"
        ? 0.5
        : 0;
  vec[i++] =
    fingerprint.palette.contrast === "high"
      ? 1
      : fingerprint.palette.contrast === "moderate"
        ? 0.5
        : 0;
  vec[i++] = Math.min(fingerprint.palette.semantic.length / 10, 1);

  // --- Spacing (10 dims) ---
  const spacing = fingerprint.spacing;
  vec[i++] = Math.min(spacing.scale.length / 10, 1);
  vec[i++] = spacing.scale.length > 0 ? Math.min(spacing.scale[0] / 100, 1) : 0;
  vec[i++] =
    spacing.scale.length > 0
      ? Math.min(spacing.scale[spacing.scale.length - 1] / 100, 1)
      : 0;
  vec[i++] = spacing.regularity;
  vec[i++] = spacing.baseUnit ? Math.min(spacing.baseUnit / 16, 1) : 0;
  // Median value
  const spacingMid =
    spacing.scale.length > 0
      ? spacing.scale[Math.floor(spacing.scale.length / 2)] / 100
      : 0;
  vec[i++] = Math.min(spacingMid, 1);
  // Spread (stddev-like): how varied is the scale?
  if (spacing.scale.length >= 2) {
    const mean =
      spacing.scale.reduce((a, b) => a + b, 0) / spacing.scale.length;
    const variance =
      spacing.scale.reduce((sum, v) => sum + (v - mean) ** 2, 0) /
      spacing.scale.length;
    vec[i++] = Math.min(Math.sqrt(variance) / 50, 1); // normalized spread
  } else {
    vec[i++] = 0;
  }
  // Step ratio: ratio between consecutive values (geometric vs linear)
  if (spacing.scale.length >= 3) {
    const ratios: number[] = [];
    for (let s = 1; s < spacing.scale.length; s++) {
      if (spacing.scale[s - 1] > 0) {
        ratios.push(spacing.scale[s] / spacing.scale[s - 1]);
      }
    }
    const avgRatio =
      ratios.length > 0
        ? ratios.reduce((a, b) => a + b, 0) / ratios.length
        : 1;
    vec[i++] = Math.min(avgRatio / 4, 1); // 2.0 = geometric doubling
  } else {
    vec[i++] = 0;
  }
  // Density: values per unit range
  if (spacing.scale.length >= 2) {
    const range =
      spacing.scale[spacing.scale.length - 1] - spacing.scale[0];
    vec[i++] = range > 0 ? Math.min(spacing.scale.length / range, 1) : 0;
  } else {
    vec[i++] = 0;
  }
  // Range ratio: max/min
  if (spacing.scale.length >= 2 && spacing.scale[0] > 0) {
    vec[i++] = Math.min(
      spacing.scale[spacing.scale.length - 1] / spacing.scale[0] / 50,
      1,
    );
  } else {
    vec[i++] = 0;
  }

  // --- Typography (10 dims) ---
  const typo = fingerprint.typography;
  vec[i++] = Math.min(typo.families.length / 5, 1);
  vec[i++] = Math.min(typo.sizeRamp.length / 10, 1);
  // Size range
  vec[i++] = typo.sizeRamp.length > 0 ? Math.min(typo.sizeRamp[0] / 100, 1) : 0;
  vec[i++] =
    typo.sizeRamp.length > 0
      ? Math.min(typo.sizeRamp[typo.sizeRamp.length - 1] / 100, 1)
      : 0;
  // Weight distribution entropy
  const weights = Object.values(typo.weightDistribution);
  const totalWeights = weights.reduce((a, b) => a + b, 0);
  vec[i++] =
    totalWeights > 0
      ? -weights.reduce((ent, w) => {
          const p = w / totalWeights;
          return p > 0 ? ent + p * Math.log2(p) : ent;
        }, 0) / Math.log2(Math.max(weights.length, 2))
      : 0;
  // Line height
  vec[i++] =
    typo.lineHeightPattern === "tight"
      ? 0
      : typo.lineHeightPattern === "normal"
        ? 0.5
        : 1;
  // Weight count: how many distinct weights are used
  vec[i++] = Math.min(Object.keys(typo.weightDistribution).length / 6, 1);
  // Weight spread: range of weights used (100-900 scale)
  const weightKeys = Object.keys(typo.weightDistribution).map(Number);
  if (weightKeys.length >= 2) {
    vec[i++] = (Math.max(...weightKeys) - Math.min(...weightKeys)) / 800;
  } else {
    vec[i++] = 0;
  }
  // Size ramp range ratio
  if (typo.sizeRamp.length >= 2 && typo.sizeRamp[0] > 0) {
    vec[i++] = Math.min(
      typo.sizeRamp[typo.sizeRamp.length - 1] / typo.sizeRamp[0] / 10,
      1,
    );
  } else {
    vec[i++] = 0;
  }
  // Size ramp median
  if (typo.sizeRamp.length > 0) {
    vec[i++] = Math.min(
      typo.sizeRamp[Math.floor(typo.sizeRamp.length / 2)] / 100,
      1,
    );
  } else {
    vec[i++] = 0;
  }

  // --- Surfaces (8 dims) ---
  const surfaces = fingerprint.surfaces;
  vec[i++] = Math.min(surfaces.borderRadii.length / 5, 1);
  vec[i++] =
    surfaces.borderRadii.length > 0
      ? Math.min(surfaces.borderRadii[0] / 32, 1)
      : 0;
  vec[i++] =
    surfaces.borderRadii.length > 0
      ? Math.min(surfaces.borderRadii[surfaces.borderRadii.length - 1] / 32, 1)
      : 0;
  vec[i++] =
    surfaces.shadowComplexity === "layered"
      ? 1
      : surfaces.shadowComplexity === "subtle"
        ? 0.5
        : 0;
  vec[i++] =
    surfaces.borderUsage === "heavy"
      ? 1
      : surfaces.borderUsage === "moderate"
        ? 0.5
        : 0;
  // Radii spread: range of border radii
  if (surfaces.borderRadii.length >= 2) {
    vec[i++] = Math.min(
      (surfaces.borderRadii[surfaces.borderRadii.length - 1] -
        surfaces.borderRadii[0]) /
        32,
      1,
    );
  } else {
    vec[i++] = 0;
  }
  // Radii median
  if (surfaces.borderRadii.length > 0) {
    vec[i++] = Math.min(
      surfaces.borderRadii[Math.floor(surfaces.borderRadii.length / 2)] / 32,
      1,
    );
  } else {
    vec[i++] = 0;
  }
  // Max radius (signals "pill" shapes — high max radius is distinctive)
  if (surfaces.borderRadii.length > 0) {
    vec[i++] = Math.min(
      surfaces.borderRadii[surfaces.borderRadii.length - 1] / 100,
      1,
    );
  } else {
    vec[i++] = 0;
  }

  // --- Architecture (15 dims) ---
  const arch = fingerprint.architecture;
  vec[i++] = arch.tokenization;
  vec[i++] = Math.min(arch.componentCount / 50, 1);
  // Methodology encoding
  vec[i++] = arch.methodology.includes("tailwind") ? 1 : 0;
  vec[i++] = arch.methodology.includes("css-custom-properties") ? 1 : 0;
  vec[i++] = arch.methodology.includes("scss") ? 1 : 0;
  vec[i++] = arch.methodology.includes("css-modules") ? 1 : 0;
  // Category diversity
  const catCount = Object.keys(arch.componentCategories).length;
  vec[i++] = Math.min(catCount / 10, 1);
  // Naming pattern
  vec[i++] =
    arch.namingPattern === "kebab-case"
      ? 0
      : arch.namingPattern === "camelCase"
        ? 0.33
        : arch.namingPattern === "PascalCase"
          ? 0.67
          : 1;
  // Category diversity entropy
  const catValues = Object.values(arch.componentCategories);
  const totalComponents = catValues.reduce((a, b) => a + b, 0);
  if (totalComponents > 0 && catValues.length > 1) {
    vec[i++] =
      -catValues.reduce((ent, c) => {
        const p = c / totalComponents;
        return p > 0 ? ent + p * Math.log2(p) : ent;
      }, 0) / Math.log2(catValues.length);
  } else {
    vec[i++] = 0;
  }
  // Component density: components per category
  vec[i++] = catCount > 0 ? Math.min(arch.componentCount / catCount / 10, 1) : 0;
  // Methodology count
  vec[i++] = Math.min(arch.methodology.length / 4, 1);
  // Has styled-components / emotion
  vec[i++] = arch.methodology.includes("styled-components") || arch.methodology.includes("emotion") ? 1 : 0;
  // Has CSS-in-JS (any)
  vec[i++] =
    arch.methodology.includes("styled-components") ||
    arch.methodology.includes("emotion") ||
    arch.methodology.includes("css-modules")
      ? 1
      : 0;
  // Component scale bucket (small <10, medium 10-30, large 30+)
  vec[i++] =
    arch.componentCount < 10
      ? 0
      : arch.componentCount < 30
        ? 0.5
        : 1;
  // Tokenization squared (amplifies differences at extremes)
  vec[i++] = arch.tokenization * arch.tokenization;

  return vec;
}

/**
 * Cosine similarity between two embedding vectors (0 = identical, 1 = orthogonal)
 */
export function embeddingDistance(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < len; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) return 1;

  // Convert similarity (1 = identical) to distance (0 = identical)
  return 1 - dotProduct / magnitude;
}
