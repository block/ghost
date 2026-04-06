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
 *  [12-17]  Palette: neutral ramp features (count, min/max lightness, spread)
 *  [18-20]  Palette: qualitative (saturation profile, contrast, semantic count)
 *  [21-30]  Spacing: scale features (count, min, max, regularity, base unit, distribution)
 *  [31-40]  Typography: families count, size ramp features, weight distribution
 *  [41-48]  Surfaces: radii features, shadow complexity, border usage
 *  [49-63]  Architecture: tokenization, component count, methodology, categories
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
  vec[i++] = Math.min(fingerprint.palette.neutrals.count / 10, 1);
  // Parse lightness from neutral steps (use oklch if available from semantic colors)
  const neutralCount = fingerprint.palette.neutrals.count;
  vec[i++] = neutralCount > 0 ? 1 : 0; // has neutrals
  vec[i++] = Math.min(neutralCount / 20, 1); // ramp density
  i += 3; // reserved for neutral lightness range

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
  // Distribution: quartile features
  const spacingMid =
    spacing.scale.length > 0
      ? spacing.scale[Math.floor(spacing.scale.length / 2)] / 100
      : 0;
  vec[i++] = Math.min(spacingMid, 1);
  i += 4; // reserved

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
  i += 4; // reserved

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
  i += 3; // reserved

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
