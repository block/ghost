import { describe, expect, it } from "vitest";
import {
  computeEmbedding,
  embeddingDistance,
} from "../../src/core/embedding/embedding.js";
import type { Expression } from "../../src/core/types.js";

function makeExpression(
  overrides: Partial<Omit<Expression, "embedding">> = {},
): Omit<Expression, "embedding"> {
  return {
    id: "test",
    source: "registry",
    timestamp: new Date().toISOString(),
    palette: {
      dominant: [
        { role: "primary", value: "#3b82f6", oklch: [0.623, 0.214, 259.8] },
      ],
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
  it("produces 49-dimensional vector", () => {
    const fp = makeExpression();
    const embedding = computeEmbedding(fp);
    expect(embedding).toHaveLength(49);
  });

  it("all values are between 0 and 1", () => {
    const fp = makeExpression();
    const embedding = computeEmbedding(fp);
    for (const v of embedding) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1.01); // small tolerance for floating point
    }
  });

  it("identical expressions produce identical embeddings", () => {
    const fp = makeExpression();
    const e1 = computeEmbedding(fp);
    const e2 = computeEmbedding(fp);
    expect(e1).toEqual(e2);
  });
});

describe("log-scaled normalization", () => {
  it("spacing count: log-scaling differentiates scale sizes", () => {
    const small = computeEmbedding(
      makeExpression({
        spacing: { ...makeExpression().spacing, scale: [4, 8] },
      }),
    );
    const large = computeEmbedding(
      makeExpression({
        spacing: {
          ...makeExpression().spacing,
          scale: [4, 8, 12, 16, 24, 32, 48, 64],
        },
      }),
    );

    // Spacing count is at index 21
    expect(small[21]).toBeLessThan(large[21]);
  });
});

describe("border usage continuous scoring", () => {
  it("uses borderTokenCount when available", () => {
    const withCount = computeEmbedding(
      makeExpression({
        surfaces: {
          ...makeExpression().surfaces,
          borderUsage: "moderate",
          borderTokenCount: 5,
        },
      }),
    );
    const withHighCount = computeEmbedding(
      makeExpression({
        surfaces: {
          ...makeExpression().surfaces,
          borderUsage: "moderate",
          borderTokenCount: 8,
        },
      }),
    );

    // Border usage dimension is at index 45 (surfaces start at 41, borderUsage is 5th)
    expect(withHighCount[45]).toBeGreaterThan(withCount[45]);
  });
});

describe("embedding is purely visual", () => {
  it("architecture changes do not affect embedding", () => {
    const a = computeEmbedding(makeExpression());
    const b = computeEmbedding(
      makeExpression({
        architecture: {
          tokenization: 0.1,
          methodology: ["scss"],
          componentCount: 200,
          componentCategories: { widgets: 200 },
          namingPattern: "PascalCase",
        },
      }),
    );

    expect(a).toEqual(b);
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
