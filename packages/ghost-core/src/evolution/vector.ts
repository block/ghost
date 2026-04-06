import type { DesignFingerprint, DriftVector } from "../types.js";

/**
 * Embedding dimension ranges per design dimension.
 * Mirrors the layout in fingerprint/embedding.ts.
 */
const DIMENSION_RANGES: Record<string, [number, number]> = {
  palette: [0, 21], // dominant (0-11) + neutrals (12-17) + qualitative (18-20)
  spacing: [21, 31],
  typography: [31, 41],
  surfaces: [41, 49],
  architecture: [49, 64],
};

/**
 * Compute per-dimension drift vectors from two fingerprints' embeddings.
 * Each vector captures the direction and magnitude of change in embedding space
 * for a specific design dimension.
 */
export function computeDriftVectors(
  source: DesignFingerprint,
  target: DesignFingerprint,
): DriftVector[] {
  const vectors: DriftVector[] = [];

  for (const [dimension, [start, end]] of Object.entries(DIMENSION_RANGES)) {
    const delta: number[] = [];
    let sumSq = 0;

    for (let i = start; i < end; i++) {
      const d = (target.embedding[i] ?? 0) - (source.embedding[i] ?? 0);
      delta.push(d);
      sumSq += d * d;
    }

    vectors.push({
      dimension,
      magnitude: Math.sqrt(sumSq),
      embeddingDelta: delta,
    });
  }

  return vectors;
}
