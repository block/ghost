import { describe, expect, it } from "vitest";
import { checkBounds } from "../../src/evolution/sync.js";
import type {
  DimensionAck,
  Expression,
  ExpressionComparison,
  SyncManifest,
} from "../../src/types.js";

function makeManifest(
  dimensions: Record<string, Partial<DimensionAck>>,
): SyncManifest {
  const fullDimensions: Record<string, DimensionAck> = {};
  for (const [key, partial] of Object.entries(dimensions)) {
    fullDimensions[key] = {
      distance: 0.1,
      stance: "accepted",
      ackedAt: new Date().toISOString(),
      ...partial,
    };
  }

  return {
    parent: { type: "default" },
    ackedAt: new Date().toISOString(),
    parentExpressionId: "parent",
    childExpressionId: "child",
    dimensions: fullDimensions,
    overallDistance: 0.2,
  };
}

function makeComparison(
  dimensions: Record<string, number>,
): ExpressionComparison {
  const fp: Expression = {
    id: "test",
    source: "registry",
    timestamp: new Date().toISOString(),
    palette: {
      dominant: [],
      neutrals: { steps: [], count: 0 },
      semantic: [],
      saturationProfile: "muted",
      contrast: "moderate",
    },
    spacing: { scale: [], regularity: 0, baseUnit: null },
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
      tokenization: 0,
      methodology: [],
      componentCount: 0,
      componentCategories: {},
      namingPattern: "unknown",
    },
    embedding: [],
  };

  return {
    source: fp,
    target: fp,
    distance:
      Object.values(dimensions).reduce((a, b) => a + b, 0) /
      Object.keys(dimensions).length,
    dimensions: Object.fromEntries(
      Object.entries(dimensions).map(([key, dist]) => [
        key,
        { dimension: key, distance: dist, description: "" },
      ]),
    ),
    summary: "",
  };
}

describe("checkBounds", () => {
  it("detects exceeded dimensions with default tolerance", () => {
    const manifest = makeManifest({
      palette: { distance: 0.1, stance: "accepted" },
      spacing: { distance: 0.05, stance: "accepted" },
    });
    const comparison = makeComparison({ palette: 0.2, spacing: 0.05 });

    const result = checkBounds(manifest, comparison);
    expect(result.exceeded).toBe(true);
    expect(result.dimensions).toContain("palette");
    expect(result.dimensions).not.toContain("spacing");
  });

  it("uses per-dimension tolerance", () => {
    const manifest = makeManifest({
      palette: { distance: 0.1, stance: "accepted", tolerance: 0.02 },
      spacing: { distance: 0.1, stance: "accepted", tolerance: 0.2 },
    });
    // Both increased by 0.05
    const comparison = makeComparison({ palette: 0.15, spacing: 0.15 });

    const result = checkBounds(manifest, comparison);
    // Palette: 0.15 > 0.1 + 0.02 = 0.12 → exceeded
    // Spacing: 0.15 < 0.1 + 0.2 = 0.3 → not exceeded
    expect(result.dimensions).toContain("palette");
    expect(result.dimensions).not.toContain("spacing");
  });

  it("detects reconverging dimensions", () => {
    const manifest = makeManifest({
      palette: { distance: 0.4, stance: "diverging" },
    });
    // Distance has dropped to less than 50% of acked
    const comparison = makeComparison({ palette: 0.15 });

    const result = checkBounds(manifest, comparison);
    expect(result.reconverging).toContain("palette");
  });

  it("does not flag reconverging if still far from parent", () => {
    const manifest = makeManifest({
      palette: { distance: 0.4, stance: "diverging" },
    });
    // Distance still at 60% of acked — not reconverging
    const comparison = makeComparison({ palette: 0.25 });

    const result = checkBounds(manifest, comparison);
    expect(result.reconverging).not.toContain("palette");
  });

  it("flags diverging dimensions past maxDivergenceDays", () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 100); // 100 days ago

    const manifest = makeManifest({
      palette: {
        distance: 0.4,
        stance: "diverging",
        divergedAt: oldDate.toISOString(),
      },
    });
    const comparison = makeComparison({ palette: 0.5 });

    const result = checkBounds(manifest, comparison, {
      maxDivergenceDays: 30,
    });
    expect(result.dimensions).toContain("palette");
  });

  it("does not flag diverging within maxDivergenceDays", () => {
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 10); // 10 days ago

    const manifest = makeManifest({
      palette: {
        distance: 0.4,
        stance: "diverging",
        divergedAt: recentDate.toISOString(),
      },
    });
    const comparison = makeComparison({ palette: 0.5 });

    const result = checkBounds(manifest, comparison, {
      maxDivergenceDays: 30,
    });
    expect(result.dimensions).not.toContain("palette");
  });

  it("backward compatible: number tolerance still works", () => {
    const manifest = makeManifest({
      palette: { distance: 0.1, stance: "accepted" },
    });
    const comparison = makeComparison({ palette: 0.25 });

    const result = checkBounds(manifest, comparison, 0.1);
    expect(result.exceeded).toBe(true);
  });
});
