import { describe, expect, it } from "vitest";
import {
  DIMENSION_RANGES,
  computeDriftVectors,
} from "../../src/evolution/vector.js";
import { makeFingerprint, makeDriftedFingerprint } from "../helpers/fingerprint-factory.js";

describe("DIMENSION_RANGES", () => {
  it("contains all 5 expected dimensions", () => {
    const keys = Object.keys(DIMENSION_RANGES);
    expect(keys).toEqual(
      expect.arrayContaining(["palette", "spacing", "typography", "surfaces", "architecture"]),
    );
    expect(keys).toHaveLength(5);
  });

  it("covers all 64 embedding dimensions contiguously", () => {
    const ranges = Object.values(DIMENSION_RANGES).sort((a, b) => a[0] - b[0]);

    // First range starts at 0
    expect(ranges[0][0]).toBe(0);
    // Last range ends at 64
    expect(ranges[ranges.length - 1][1]).toBe(64);

    // Each range starts where the previous one ended
    for (let i = 1; i < ranges.length; i++) {
      expect(ranges[i][0]).toBe(ranges[i - 1][1]);
    }
  });
});

describe("computeDriftVectors", () => {
  it("returns one vector per dimension (5 total)", () => {
    const a = makeFingerprint();
    const b = makeFingerprint({ id: "target" });
    const vectors = computeDriftVectors(a, b);
    expect(vectors).toHaveLength(5);
    expect(vectors.map((v) => v.dimension)).toEqual(
      expect.arrayContaining(["palette", "spacing", "typography", "surfaces", "architecture"]),
    );
  });

  it("returns zero magnitude for identical fingerprints", () => {
    const fp = makeFingerprint();
    const vectors = computeDriftVectors(fp, fp);

    for (const v of vectors) {
      expect(v.magnitude).toBeCloseTo(0);
    }
  });

  it("computes correct magnitude as L2 norm of delta slice", () => {
    const a = makeFingerprint();
    const b = makeDriftedFingerprint(a, {
      palette: {
        dominant: [{ role: "accent", value: "#ff0000", oklch: [0.6, 0.3, 30] }],
      },
    });

    const vectors = computeDriftVectors(a, b);
    const paletteVec = vectors.find((v) => v.dimension === "palette")!;

    // Verify magnitude = sqrt(sum of squares of delta)
    const expectedMag = Math.sqrt(
      paletteVec.embeddingDelta.reduce((sum, d) => sum + d * d, 0),
    );
    expect(paletteVec.magnitude).toBeCloseTo(expectedMag);
  });

  it("embeddingDelta length matches the dimension range", () => {
    const a = makeFingerprint();
    const b = makeFingerprint({ id: "b" });
    const vectors = computeDriftVectors(a, b);

    for (const v of vectors) {
      const [start, end] = DIMENSION_RANGES[v.dimension];
      expect(v.embeddingDelta).toHaveLength(end - start);
    }
  });
});
