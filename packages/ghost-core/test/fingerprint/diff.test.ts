import { describe, expect, it } from "vitest";
import { diffFingerprints } from "../../src/fingerprint/index.js";
import type { Fingerprint } from "../../src/types.js";

const BASE: Fingerprint = {
  id: "base",
  source: "llm",
  timestamp: "2026-04-17T00:00:00.000Z",
  decisions: [
    {
      dimension: "warm-neutrals",
      decision: "No cool grays anywhere.",
      evidence: ["#141413", "#4d4c48"],
    },
    {
      dimension: "serif-headlines",
      decision: "All headlines use Serif 500.",
      evidence: ["H1-H6"],
    },
  ],
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

describe("diffFingerprints", () => {
  it("returns unchanged=true for an identical fingerprint", () => {
    const diff = diffFingerprints(BASE, structuredClone(BASE));
    expect(diff.unchanged).toBe(true);
  });

  it("detects added and removed decisions by dimension", () => {
    const b: Fingerprint = structuredClone(BASE);
    const first = BASE.decisions?.[0];
    if (!first) throw new Error("BASE must have a first decision");
    b.decisions = [
      first,
      {
        dimension: "new-thing",
        decision: "Something new",
        evidence: [],
      },
    ];
    const diff = diffFingerprints(BASE, b);
    expect(diff.decisions.added.map((d) => d.dimension)).toEqual(["new-thing"]);
    expect(diff.decisions.removed.map((d) => d.dimension)).toEqual([
      "serif-headlines",
    ]);
  });

  it("detects modified decisions (both prose and evidence deltas)", () => {
    const b: Fingerprint = structuredClone(BASE);
    const d0 = b.decisions?.[0];
    if (!d0) throw new Error("BASE must have a first decision");
    d0.decision = "No cool grays, no cool whites.";
    d0.evidence = ["#141413", "#4d4c48", "#5e5d59"];
    const diff = diffFingerprints(BASE, b);
    expect(diff.decisions.modified).toHaveLength(1);
    expect(diff.decisions.modified[0].dimension).toBe("warm-neutrals");
    expect(diff.decisions.modified[0].decisionChanged).toBe(true);
    expect(diff.decisions.modified[0].evidenceAdded).toEqual(["#5e5d59"]);
  });

  it("detects palette role swaps and value changes", () => {
    const b: Fingerprint = structuredClone(BASE);
    b.palette.dominant = [{ role: "accent", value: "#d15a40" }];
    b.palette.semantic = [
      { role: "error", value: "#b53333" },
      { role: "focus", value: "#3898ec" },
    ];
    const diff = diffFingerprints(BASE, b);
    expect(diff.palette.dominantChanged).toEqual([
      { role: "accent", from: "#c96442", to: "#d15a40" },
    ]);
    expect(diff.palette.semanticAdded).toEqual([
      { role: "focus", value: "#3898ec" },
    ]);
  });

  it("detects scalar token changes", () => {
    const b: Fingerprint = structuredClone(BASE);
    b.spacing.scale = [4, 8, 16, 24, 32];
    b.surfaces.shadowComplexity = "layered";
    const diff = diffFingerprints(BASE, b);
    const fields = diff.tokens.map((t) => t.field);
    expect(fields).toContain("spacing.scale");
    expect(fields).toContain("surfaces.shadowComplexity");
  });
});
