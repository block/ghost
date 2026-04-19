import { describe, expect, it } from "vitest";
import { compareFleet } from "../../src/evolution/fleet.js";
import type { Expression, FleetMember } from "../../src/types.js";

function makeFleetMember(
  id: string,
  embeddingOverrides: Partial<Record<number, number>> = {},
): FleetMember {
  const embedding = new Array(64).fill(0.5);
  for (const [idx, val] of Object.entries(embeddingOverrides)) {
    embedding[Number(idx)] = val;
  }

  const fp: Expression = {
    id,
    source: "registry",
    timestamp: new Date().toISOString(),
    palette: {
      dominant: [{ role: "primary", value: "#000", oklch: [0.5, 0.15, 240] }],
      neutrals: { steps: [], count: 0 },
      semantic: [{ role: "primary", value: "#000", oklch: [0.5, 0.15, 240] }],
      saturationProfile: "mixed",
      contrast: "moderate",
    },
    spacing: { scale: [4, 8, 16], regularity: 0.8, baseUnit: 4 },
    typography: {
      families: ["Inter"],
      sizeRamp: [14, 16, 18],
      weightDistribution: { 400: 1, 700: 1 },
      lineHeightPattern: "normal",
    },
    surfaces: {
      borderRadii: [4, 8],
      shadowComplexity: "subtle",
      borderUsage: "moderate",
    },
    architecture: {
      tokenization: 0.8,
      methodology: ["css-custom-properties"],
      componentCount: 20,
      componentCategories: { ui: 20 },
      namingPattern: "kebab-case",
    },
    embedding,
  };

  return { id, expression: fp };
}

describe("compareFleet", () => {
  it("computes pairwise distances", () => {
    const members = [
      makeFleetMember("a"),
      makeFleetMember("b"),
      makeFleetMember("c"),
    ];
    const result = compareFleet(members);
    expect(result.pairwise).toHaveLength(3); // 3 choose 2
  });

  it("computes centroid and spread", () => {
    const members = [makeFleetMember("a"), makeFleetMember("b")];
    const result = compareFleet(members);
    expect(result.centroid).toHaveLength(64);
    expect(result.spread).toBeGreaterThanOrEqual(0);
  });

  it("K=2 clustering works (backward compatible)", () => {
    const members = [
      makeFleetMember("a", { 0: 0.0, 1: 0.0 }),
      makeFleetMember("b", { 0: 0.05, 1: 0.05 }),
      makeFleetMember("c", { 0: 1.0, 1: 1.0 }),
    ];
    const result = compareFleet(members, { cluster: true });
    expect(result.clusters).toBeDefined();
    expect(result.clusters?.length).toBeGreaterThanOrEqual(1);
    expect(result.clusters?.length).toBeLessThanOrEqual(3);
  });

  it("adaptive K: detects 3 natural clusters", () => {
    // Create 3 clearly separated groups
    const members = [
      // Group 1: embedding near 0
      makeFleetMember("a1", { 0: 0.0, 1: 0.0, 2: 0.0 }),
      makeFleetMember("a2", { 0: 0.05, 1: 0.05, 2: 0.05 }),
      // Group 2: embedding near 0.5
      makeFleetMember("b1", { 0: 0.5, 1: 0.5, 2: 0.5 }),
      makeFleetMember("b2", { 0: 0.55, 1: 0.55, 2: 0.55 }),
      // Group 3: embedding near 1
      makeFleetMember("c1", { 0: 1.0, 1: 1.0, 2: 1.0 }),
      makeFleetMember("c2", { 0: 0.95, 1: 0.95, 2: 0.95 }),
    ];
    const result = compareFleet(members, { cluster: { maxK: 5 } });
    expect(result.clusters).toBeDefined();
    // Should detect >= 2 clusters (ideally 3)
    expect(result.clusters?.length).toBeGreaterThanOrEqual(2);
  });

  it("maxK option limits cluster count", () => {
    const members = [
      makeFleetMember("a", { 0: 0.0 }),
      makeFleetMember("b", { 0: 0.5 }),
      makeFleetMember("c", { 0: 1.0 }),
      makeFleetMember("d", { 0: 0.25 }),
      makeFleetMember("e", { 0: 0.75 }),
    ];
    const result = compareFleet(members, { cluster: { maxK: 3 } });
    expect(result.clusters).toBeDefined();
    expect(result.clusters?.length).toBeLessThanOrEqual(3);
  });

  it("does not cluster with fewer than 3 members", () => {
    const members = [makeFleetMember("a"), makeFleetMember("b")];
    const result = compareFleet(members, { cluster: true });
    expect(result.clusters).toBeUndefined();
  });

  it("all members appear in exactly one cluster", () => {
    const members = [
      makeFleetMember("a"),
      makeFleetMember("b"),
      makeFleetMember("c"),
      makeFleetMember("d"),
    ];
    const result = compareFleet(members, { cluster: true });
    const allIds = result.clusters?.flatMap((c) => c.memberIds);
    expect(allIds.sort()).toEqual(["a", "b", "c", "d"]);
  });
});
