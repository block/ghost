import { describe, expect, it } from "vitest";
import { computeEmbedding, embeddingDistance } from "../../src/fingerprint/embedding.js";
import type { DesignFingerprint } from "../../src/types.js";

function makeFingerprint(
  overrides: Partial<Omit<DesignFingerprint, "embedding">> = {},
): Omit<DesignFingerprint, "embedding"> {
  return {
    id: "test",
    source: "registry",
    timestamp: new Date().toISOString(),
    palette: {
      dominant: [{ role: "primary", value: "#3b82f6", oklch: [0.623, 0.214, 259.8] }],
      neutrals: { steps: ["#fff", "#f5f5f5", "#e5e5e5", "#ccc"], count: 4 },
      semantic: [
        { role: "primary", value: "#3b82f6", oklch: [0.623, 0.214, 259.8] },
        { role: "surface", value: "#ffffff", oklch: [1, 0, 0] },
        { role: "text", value: "#0a0a0a", oklch: [0.07, 0, 0] },
      ],
      saturationProfile: "mixed",
      contrast: "high",
    },
    spacing: {
      scale: [4, 8, 12, 16, 24, 32, 48, 64],
      regularity: 0.8,
      baseUnit: 4,
    },
    typography: {
      families: ["Inter", "Geist Mono"],
      sizeRamp: [12, 14, 16, 18, 20, 24, 30, 36, 48],
      weightDistribution: { 400: 3, 500: 2, 600: 1, 700: 1 },
      lineHeightPattern: "normal",
    },
    surfaces: {
      borderRadii: [2, 4, 8, 12],
      shadowComplexity: "subtle",
      borderUsage: "moderate",
      borderTokenCount: 2,
    },
    architecture: {
      tokenization: 0.85,
      methodology: ["css-custom-properties", "tailwind"],
      componentCount: 45,
      componentCategories: { ui: 30, layout: 10, feedback: 5 },
      namingPattern: "kebab-case",
    },
    ...overrides,
  };
}

describe("computeEmbedding", () => {
  it("produces 64-dimensional vector", () => {
    const fp = makeFingerprint();
    const embedding = computeEmbedding(fp);
    expect(embedding).toHaveLength(64);
  });

  it("all values are between 0 and 1", () => {
    const fp = makeFingerprint();
    const embedding = computeEmbedding(fp);
    for (const v of embedding) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1.01); // small tolerance for floating point
    }
  });

  it("identical fingerprints produce identical embeddings", () => {
    const fp = makeFingerprint();
    const e1 = computeEmbedding(fp);
    const e2 = computeEmbedding(fp);
    expect(e1).toEqual(e2);
  });
});

describe("log-scaled normalization", () => {
  it("component count: log-scaling differentiates mature systems", () => {
    const small = computeEmbedding(
      makeFingerprint({ architecture: { ...makeFingerprint().architecture, componentCount: 10 } }),
    );
    const medium = computeEmbedding(
      makeFingerprint({ architecture: { ...makeFingerprint().architecture, componentCount: 50 } }),
    );
    const large = computeEmbedding(
      makeFingerprint({ architecture: { ...makeFingerprint().architecture, componentCount: 100 } }),
    );
    const huge = computeEmbedding(
      makeFingerprint({ architecture: { ...makeFingerprint().architecture, componentCount: 150 } }),
    );

    // Architecture component count is at index 50 (tokenization=49, componentCount=50)
    // Log-scaling: large and huge should still be different
    expect(large[50]).not.toEqual(huge[50]);
    // Ordering preserved
    expect(small[50]).toBeLessThan(medium[50]);
    expect(medium[50]).toBeLessThan(large[50]);
    expect(large[50]).toBeLessThan(huge[50]);
  });

  it("log-scaling avoids ceiling effect: 50 and 100 are distinguishable", () => {
    const fp50 = computeEmbedding(
      makeFingerprint({ architecture: { ...makeFingerprint().architecture, componentCount: 50 } }),
    );
    const fp100 = computeEmbedding(
      makeFingerprint({ architecture: { ...makeFingerprint().architecture, componentCount: 100 } }),
    );

    // With old linear scaling (cap 50), both would map to 1.0 (identical)
    // With log-scaling, they should be different
    const delta = Math.abs(fp100[50] - fp50[50]);
    expect(delta).toBeGreaterThan(0.05);
  });
});

describe("border usage continuous scoring", () => {
  it("uses borderTokenCount when available", () => {
    const withCount = computeEmbedding(
      makeFingerprint({
        surfaces: {
          ...makeFingerprint().surfaces,
          borderUsage: "moderate",
          borderTokenCount: 5,
        },
      }),
    );
    const withHighCount = computeEmbedding(
      makeFingerprint({
        surfaces: {
          ...makeFingerprint().surfaces,
          borderUsage: "moderate",
          borderTokenCount: 8,
        },
      }),
    );

    // Border usage dimension is at index 45 (surfaces start at 41, borderUsage is 5th)
    expect(withHighCount[45]).toBeGreaterThan(withCount[45]);
  });
});

describe("tokenization sqrt", () => {
  it("amplifies low-end differences", () => {
    const low = computeEmbedding(
      makeFingerprint({ architecture: { ...makeFingerprint().architecture, tokenization: 0.25 } }),
    );
    const mid = computeEmbedding(
      makeFingerprint({ architecture: { ...makeFingerprint().architecture, tokenization: 0.5 } }),
    );
    const high = computeEmbedding(
      makeFingerprint({ architecture: { ...makeFingerprint().architecture, tokenization: 0.75 } }),
    );

    // Last dimension (index 63) is sqrt(tokenization)
    expect(low[63]).toBeCloseTo(0.5, 1); // sqrt(0.25) = 0.5
    expect(mid[63]).toBeCloseTo(0.707, 1); // sqrt(0.5) ≈ 0.707
    expect(high[63]).toBeCloseTo(0.866, 1); // sqrt(0.75) ≈ 0.866
  });
});

describe("embeddingDistance", () => {
  it("identical vectors have distance 0", () => {
    const v = [0.5, 0.3, 0.7, 0.1];
    expect(embeddingDistance(v, v)).toBeCloseTo(0, 5);
  });

  it("orthogonal vectors have distance ~1", () => {
    const a = [1, 0, 0, 0];
    const b = [0, 1, 0, 0];
    expect(embeddingDistance(a, b)).toBeCloseTo(1, 5);
  });
});
