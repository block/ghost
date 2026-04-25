import { describe, expect, it } from "vitest";
import { compare } from "../src/core/compare.js";
import type { Expression } from "../src/core/types.js";

const BASE: Expression = {
  id: "base",
  source: "llm",
  timestamp: "2026-04-17T00:00:00.000Z",
  palette: {
    dominant: [{ role: "accent", value: "#c96442" }],
    neutrals: { steps: ["#141413", "#4d4c48"], count: 2 },
    semantic: [{ role: "error", value: "#b53333" }],
    saturationProfile: "muted",
    contrast: "moderate",
  },
  spacing: { scale: [4, 8, 16], baseUnit: 8, regularity: 0.85 },
  typography: {
    families: ["Serif"],
    sizeRamp: [14, 16, 20],
    weightDistribution: { 400: 1 },
    lineHeightPattern: "loose",
  },
  surfaces: {
    borderRadii: [8, 12],
    shadowComplexity: "subtle",
    borderUsage: "moderate",
  },
  embedding: [0.1, 0.2],
};

function variant(id: string, overrides: Partial<Expression> = {}): Expression {
  return { ...structuredClone(BASE), id, ...overrides };
}

describe("compare dispatch", () => {
  it("throws when given fewer than 2 expressions", () => {
    expect(() => compare([variant("a")])).toThrow(/at least 2/);
    expect(() => compare([])).toThrow(/at least 2/);
  });

  it("pairwise by default for N=2", () => {
    const result = compare([variant("a"), variant("b")]);
    expect(result.mode).toBe("pairwise");
    if (result.mode !== "pairwise") throw new Error("unreachable");
    expect(result.comparison.distance).toBeGreaterThanOrEqual(0);
    expect(result.semantic).toBeUndefined();
    expect(result.temporal).toBeUndefined();
  });

  it("adds a semantic diff when opts.semantic is set (N=2)", () => {
    const result = compare([variant("a"), variant("b")], { semantic: true });
    expect(result.mode).toBe("pairwise");
    if (result.mode !== "pairwise") throw new Error("unreachable");
    expect(result.semantic).toBeDefined();
    expect(result.semantic?.unchanged).toBeDefined();
  });

  it("adds a temporal block when history is passed (N=2)", () => {
    const result = compare([variant("a"), variant("b")], {
      history: [],
      manifest: null,
    });
    expect(result.mode).toBe("pairwise");
    if (result.mode !== "pairwise") throw new Error("unreachable");
    expect(result.temporal).toBeDefined();
    expect(result.temporal?.trajectory).toBeDefined();
  });

  it("composite mode when N≥3", () => {
    const result = compare([variant("a"), variant("b"), variant("c")]);
    expect(result.mode).toBe("composite");
    if (result.mode !== "composite") throw new Error("unreachable");
    expect(result.composite.members).toHaveLength(3);
    expect(result.composite.pairwise).toHaveLength(3);
  });

  it("composite rejects --semantic / --temporal", () => {
    const exprs = [variant("a"), variant("b"), variant("c")];
    expect(() => compare(exprs, { semantic: true })).toThrow(/pairwise/);
    expect(() => compare(exprs, { history: [] })).toThrow(/pairwise/);
  });

  it("composite uses provided ids, falls back to expression.id", () => {
    const result = compare([variant("a"), variant("b"), variant("c")], {
      ids: ["alpha", "beta", "gamma"],
    });
    if (result.mode !== "composite") throw new Error("unreachable");
    expect(result.composite.members.map((m) => m.id)).toEqual([
      "alpha",
      "beta",
      "gamma",
    ]);
  });
});
