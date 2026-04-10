import { describe, expect, it } from "vitest";
import { compareFleet } from "../../src/evolution/fleet.js";
import { makeFleetMember, makeFingerprint } from "../helpers/fingerprint-factory.js";

describe("compareFleet", () => {
  it("returns empty pairwise for single member", () => {
    const result = compareFleet([makeFleetMember("solo")]);
    expect(result.pairwise).toHaveLength(0);
    expect(result.members).toHaveLength(1);
  });

  it("computes correct number of pairs for N members", () => {
    const members = [
      makeFleetMember("a"),
      makeFleetMember("b", { spacing: { baseUnit: 8 } }),
      makeFleetMember("c", { architecture: { tokenization: 0.2 } }),
      makeFleetMember("d", { typography: { families: ["Roboto"] } }),
    ];

    const result = compareFleet(members);
    // N*(N-1)/2 = 4*3/2 = 6
    expect(result.pairwise).toHaveLength(6);
  });

  it("sorts pairwise by distance ascending", () => {
    const members = [
      makeFleetMember("a"),
      makeFleetMember("b", { spacing: { baseUnit: 8 } }),
      makeFleetMember("c", { architecture: { tokenization: 0.1, methodology: ["scss"] } }),
    ];

    const result = compareFleet(members);
    for (let i = 1; i < result.pairwise.length; i++) {
      expect(result.pairwise[i].distance).toBeGreaterThanOrEqual(
        result.pairwise[i - 1].distance,
      );
    }
  });

  it("computes centroid as average embedding", () => {
    const fp = makeFingerprint();
    const members = [
      { id: "a", fingerprint: fp },
      { id: "b", fingerprint: fp },
    ];

    const result = compareFleet(members);
    // Centroid of identical embeddings = the embedding itself
    expect(result.centroid).toHaveLength(64);
    for (let i = 0; i < 64; i++) {
      expect(result.centroid[i]).toBeCloseTo(fp.embedding[i]);
    }
  });

  it("returns zero spread for identical members", () => {
    const fp = makeFingerprint();
    const members = [
      { id: "a", fingerprint: fp },
      { id: "b", fingerprint: fp },
    ];

    const result = compareFleet(members);
    expect(result.spread).toBeCloseTo(0);
  });

  it("does not cluster with fewer than 3 members", () => {
    const members = [
      makeFleetMember("a"),
      makeFleetMember("b"),
    ];

    const result = compareFleet(members, { cluster: true });
    expect(result.clusters).toBeUndefined();
  });

  it("produces 2 clusters for 4 distinct members", () => {
    // Two pairs: a+b are similar (default), c+d are similar (different)
    const members = [
      makeFleetMember("a"),
      makeFleetMember("b"),
      makeFleetMember("c", {
        palette: {
          dominant: [{ role: "accent", value: "#ff0000", oklch: [0.6, 0.3, 30] }],
          saturationProfile: "vibrant",
          contrast: "low",
        },
        spacing: { scale: [2, 10, 20], regularity: 0, baseUnit: 2 },
        architecture: { tokenization: 0.1, methodology: ["scss"], componentCount: 50 },
      }),
      makeFleetMember("d", {
        palette: {
          dominant: [{ role: "accent", value: "#ee0000", oklch: [0.58, 0.29, 28] }],
          saturationProfile: "vibrant",
          contrast: "low",
        },
        spacing: { scale: [2, 10, 20], regularity: 0, baseUnit: 2 },
        architecture: { tokenization: 0.1, methodology: ["scss"], componentCount: 48 },
      }),
    ];

    const result = compareFleet(members, { cluster: true });
    expect(result.clusters).toBeDefined();
    expect(result.clusters).toHaveLength(2);

    // Each cluster should have 2 members
    const allMemberIds = result.clusters!.flatMap((c) => c.memberIds);
    expect(allMemberIds).toHaveLength(4);
  });
});
