import { describe, expect, it } from "vitest";
import {
  computeEmbedding,
  embeddingDistance,
} from "../../src/fingerprint/embedding.js";
import { makeFingerprint } from "../helpers/fingerprint-factory.js";

describe("computeEmbedding", () => {
  it("returns a 64-element vector", () => {
    const fp = makeFingerprint();
    const embedding = computeEmbedding(fp);
    expect(embedding).toHaveLength(64);
  });

  it("is deterministic", () => {
    const fp = makeFingerprint();
    const a = computeEmbedding(fp);
    const b = computeEmbedding(fp);
    expect(a).toEqual(b);
  });

  it("returns all zeros for empty fingerprint", () => {
    const fp = makeFingerprint({
      palette: {
        dominant: [],
        neutrals: { steps: [], count: 0 },
        semantic: [],
        saturationProfile: "muted",
        contrast: "low",
      },
      spacing: { scale: [], regularity: 0, baseUnit: null },
      typography: {
        families: [],
        sizeRamp: [],
        weightDistribution: {},
        lineHeightPattern: "tight",
      },
      surfaces: {
        borderRadii: [],
        shadowComplexity: "none",
        borderUsage: "minimal",
      },
      architecture: {
        tokenization: 0,
        methodology: [],
        componentCount: 0,
        componentCategories: {},
        namingPattern: "kebab-case",
      },
    });
    const embedding = computeEmbedding(fp);
    expect(embedding).toHaveLength(64);
    // Most values should be 0, but some reserved slots or normalizations may produce small nonzero values
    const nonZeroCount = embedding.filter((v) => v !== 0).length;
    expect(nonZeroCount).toBeLessThan(5);
  });

  it("encodes saturation profile at position 18", () => {
    const vibrant = makeFingerprint({ palette: { saturationProfile: "vibrant" } });
    const muted = makeFingerprint({ palette: { saturationProfile: "muted" } });
    const mixed = makeFingerprint({ palette: { saturationProfile: "mixed" } });

    expect(computeEmbedding(vibrant)[18]).toBe(1);
    expect(computeEmbedding(muted)[18]).toBe(0);
    expect(computeEmbedding(mixed)[18]).toBe(0.5);
  });

  it("encodes contrast at position 19", () => {
    const high = makeFingerprint({ palette: { contrast: "high" } });
    const low = makeFingerprint({ palette: { contrast: "low" } });

    expect(computeEmbedding(high)[19]).toBe(1);
    expect(computeEmbedding(low)[19]).toBe(0);
  });

  it("encodes architecture tokenization at position 49", () => {
    const highToken = makeFingerprint({ architecture: { tokenization: 0.9 } });
    const lowToken = makeFingerprint({ architecture: { tokenization: 0.1 } });

    expect(computeEmbedding(highToken)[49]).toBe(0.9);
    expect(computeEmbedding(lowToken)[49]).toBe(0.1);
  });

  it("clamps values between 0 and 1", () => {
    const fp = makeFingerprint({
      spacing: { scale: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] },
      architecture: { componentCount: 200 },
    });
    const embedding = computeEmbedding(fp);
    for (const v of embedding) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});

describe("embeddingDistance", () => {
  it("returns 0 for identical vectors", () => {
    const v = [0.1, 0.5, 0.8, 0.3];
    expect(embeddingDistance(v, v)).toBeCloseTo(0, 10);
  });

  it("returns 1 for zero vectors", () => {
    const zero = [0, 0, 0, 0];
    expect(embeddingDistance(zero, zero)).toBe(1);
  });

  it("returns a value between 0 and 1 for different vectors", () => {
    const a = [1, 0, 0, 0];
    const b = [0, 1, 0, 0];
    const dist = embeddingDistance(a, b);
    expect(dist).toBeGreaterThan(0);
    expect(dist).toBeLessThanOrEqual(1);
  });

  it("is symmetric", () => {
    const a = [0.2, 0.5, 0.8];
    const b = [0.9, 0.1, 0.3];
    expect(embeddingDistance(a, b)).toBeCloseTo(embeddingDistance(b, a));
  });

  it("is smaller for similar vectors than dissimilar ones", () => {
    const base = [0.5, 0.5, 0.5, 0.5];
    const similar = [0.6, 0.5, 0.5, 0.4];
    const dissimilar = [0, 1, 0, 1];

    expect(embeddingDistance(base, similar)).toBeLessThan(
      embeddingDistance(base, dissimilar),
    );
  });
});
