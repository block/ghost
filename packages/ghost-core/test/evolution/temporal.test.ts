import { describe, expect, it } from "vitest";
import { computeTemporalComparison } from "../../src/evolution/temporal.js";
import { compareFingerprints } from "../../src/fingerprint/compare.js";
import type { SyncManifest } from "../../src/types.js";
import {
  makeFingerprint,
  makeDriftedFingerprint,
  makeHistoryEntry,
} from "../helpers/fingerprint-factory.js";

describe("computeTemporalComparison", () => {
  it("returns stable trajectory with no history", () => {
    const source = makeFingerprint();
    const target = makeFingerprint({ id: "target" });
    const comparison = compareFingerprints(source, target);

    const result = computeTemporalComparison({
      comparison,
      history: [],
      manifest: null,
    });

    expect(result.trajectory).toBe("stable");
    expect(result.velocity.every((v) => v.direction === "stable")).toBe(true);
    expect(result.velocity.every((v) => v.rate === 0)).toBe(true);
  });

  it("returns stable trajectory with 1 history entry", () => {
    const source = makeFingerprint();
    const target = makeFingerprint({ id: "target" });
    const comparison = compareFingerprints(source, target);

    const result = computeTemporalComparison({
      comparison,
      history: [makeHistoryEntry(target)],
      manifest: null,
    });

    expect(result.trajectory).toBe("stable");
  });

  it("detects diverging trajectory from history", () => {
    const source = makeFingerprint();

    // History: target was closer to source in the past, now further away
    const oldTarget = makeDriftedFingerprint(source, {
      id: "old",
      timestamp: "2025-01-01T00:00:00.000Z",
      palette: {
        dominant: [{ role: "accent", value: "#3b82f6", oklch: [0.623, 0.22, 259] }],
      },
    });

    const newTarget = makeDriftedFingerprint(source, {
      id: "new",
      timestamp: "2025-02-01T00:00:00.000Z",
      palette: {
        dominant: [{ role: "accent", value: "#ff0000", oklch: [0.6, 0.3, 30] }],
        saturationProfile: "vibrant",
        contrast: "low",
      },
      spacing: { scale: [2, 6, 10, 20, 40], regularity: 0.2, baseUnit: 2 },
      surfaces: { borderRadii: [20, 30], shadowComplexity: "layered" },
    });

    const comparison = compareFingerprints(source, newTarget);
    const result = computeTemporalComparison({
      comparison,
      history: [
        makeHistoryEntry(oldTarget),
        makeHistoryEntry(newTarget),
      ],
      manifest: null,
    });

    expect(result.trajectory).toBe("diverging");
  });

  it("computes daysSinceAck from manifest", () => {
    const source = makeFingerprint();
    const target = makeFingerprint({ id: "target" });
    const comparison = compareFingerprints(source, target);

    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const manifest: SyncManifest = {
      parent: { type: "default" },
      ackedAt: tenDaysAgo,
      parentFingerprintId: source.id,
      childFingerprintId: target.id,
      dimensions: {
        palette: { distance: 0, stance: "accepted", ackedAt: tenDaysAgo },
        spacing: { distance: 0, stance: "accepted", ackedAt: tenDaysAgo },
        typography: { distance: 0, stance: "accepted", ackedAt: tenDaysAgo },
        surfaces: { distance: 0, stance: "accepted", ackedAt: tenDaysAgo },
        architecture: { distance: 0, stance: "accepted", ackedAt: tenDaysAgo },
      },
      overallDistance: 0,
    };

    const result = computeTemporalComparison({
      comparison,
      history: [],
      manifest,
    });

    expect(result.daysSinceAck).toBe(10);
  });

  it("sets exceedsAckedBounds when drift exceeds tolerance", () => {
    const source = makeFingerprint();
    const target = makeDriftedFingerprint(source, {
      id: "target",
      palette: {
        dominant: [{ role: "accent", value: "#ff0000", oklch: [0.6, 0.3, 30] }],
        saturationProfile: "vibrant",
      },
    });
    const comparison = compareFingerprints(source, target);

    const now = new Date().toISOString();
    const manifest: SyncManifest = {
      parent: { type: "default" },
      ackedAt: now,
      parentFingerprintId: source.id,
      childFingerprintId: target.id,
      dimensions: {
        palette: { distance: 0, stance: "accepted", ackedAt: now },
        spacing: { distance: 0, stance: "accepted", ackedAt: now },
        typography: { distance: 0, stance: "accepted", ackedAt: now },
        surfaces: { distance: 0, stance: "accepted", ackedAt: now },
        architecture: { distance: 0, stance: "accepted", ackedAt: now },
      },
      overallDistance: 0,
    };

    const result = computeTemporalComparison({
      comparison,
      history: [],
      manifest,
    });

    expect(result.exceedsAckedBounds).toBe(true);
    expect(result.exceedingDimensions).toContain("palette");
  });

  it("handles null manifest gracefully", () => {
    const source = makeFingerprint();
    const target = makeFingerprint({ id: "target" });
    const comparison = compareFingerprints(source, target);

    const result = computeTemporalComparison({
      comparison,
      history: [],
      manifest: null,
    });

    expect(result.daysSinceAck).toBeNull();
    expect(result.exceedsAckedBounds).toBe(false);
    expect(result.exceedingDimensions).toHaveLength(0);
  });

  it("includes drift vectors", () => {
    const source = makeFingerprint();
    const target = makeFingerprint({ id: "target" });
    const comparison = compareFingerprints(source, target);

    const result = computeTemporalComparison({
      comparison,
      history: [],
      manifest: null,
    });

    expect(result.vectors).toBeDefined();
    expect(result.vectors).toHaveLength(5);
  });
});
