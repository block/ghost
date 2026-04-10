import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  acknowledge,
  checkBounds,
  readSyncManifest,
  writeSyncManifest,
} from "../../src/evolution/sync.js";
import { compareFingerprints } from "../../src/fingerprint/compare.js";
import type { FingerprintComparison, SyncManifest } from "../../src/types.js";
import {
  makeFingerprint,
  makeDriftedFingerprint,
} from "../helpers/fingerprint-factory.js";

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "ghost-test-sync-"));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("readSyncManifest", () => {
  it("returns null when no .ghost-sync.json exists", async () => {
    const result = await readSyncManifest(tempDir);
    expect(result).toBeNull();
  });

  it("reads and parses existing manifest", async () => {
    const manifest: SyncManifest = {
      parent: { type: "default" },
      ackedAt: "2025-01-15T00:00:00.000Z",
      parentFingerprintId: "parent-id",
      childFingerprintId: "child-id",
      dimensions: {
        palette: { distance: 0.1, stance: "accepted", ackedAt: "2025-01-15T00:00:00.000Z" },
      },
      overallDistance: 0.1,
    };

    await writeSyncManifest(manifest, tempDir);
    const result = await readSyncManifest(tempDir);

    expect(result).not.toBeNull();
    expect(result!.parentFingerprintId).toBe("parent-id");
    expect(result!.dimensions.palette.distance).toBe(0.1);
  });
});

describe("writeSyncManifest", () => {
  it("writes manifest to .ghost-sync.json", async () => {
    const manifest: SyncManifest = {
      parent: { type: "default" },
      ackedAt: "2025-01-15T00:00:00.000Z",
      parentFingerprintId: "p",
      childFingerprintId: "c",
      dimensions: {},
      overallDistance: 0,
    };

    const path = await writeSyncManifest(manifest, tempDir);
    expect(path).toContain(".ghost-sync.json");

    const read = await readSyncManifest(tempDir);
    expect(read).not.toBeNull();
  });

  it("overwrites existing manifest", async () => {
    const m1: SyncManifest = {
      parent: { type: "default" },
      ackedAt: "2025-01-15T00:00:00.000Z",
      parentFingerprintId: "old",
      childFingerprintId: "old",
      dimensions: {},
      overallDistance: 0,
    };
    const m2: SyncManifest = {
      ...m1,
      parentFingerprintId: "new",
    };

    await writeSyncManifest(m1, tempDir);
    await writeSyncManifest(m2, tempDir);

    const result = await readSyncManifest(tempDir);
    expect(result!.parentFingerprintId).toBe("new");
  });
});

describe("acknowledge", () => {
  it("creates a manifest with per-dimension acks", async () => {
    const parent = makeFingerprint({ id: "parent" });
    const child = makeDriftedFingerprint(parent, {
      id: "child",
      palette: { saturationProfile: "vibrant" },
    });

    const { manifest } = await acknowledge({
      child,
      parent,
      parentRef: { type: "default" },
      cwd: tempDir,
    });

    expect(Object.keys(manifest.dimensions)).toHaveLength(5);
    expect(manifest.parentFingerprintId).toBe("parent");
    expect(manifest.childFingerprintId).toBe("child");
  });

  it("defaults stance to 'accepted'", async () => {
    const parent = makeFingerprint({ id: "parent" });
    const child = makeFingerprint({ id: "child" });

    const { manifest } = await acknowledge({
      child,
      parent,
      parentRef: { type: "default" },
      cwd: tempDir,
    });

    for (const ack of Object.values(manifest.dimensions)) {
      expect(ack.stance).toBe("accepted");
    }
  });

  it("supports single-dimension override", async () => {
    const parent = makeFingerprint({ id: "parent" });
    const child = makeFingerprint({ id: "child" });

    const { manifest } = await acknowledge({
      child,
      parent,
      parentRef: { type: "default" },
      dimension: "palette",
      stance: "diverging",
      reason: "intentional rebrand",
      cwd: tempDir,
    });

    expect(manifest.dimensions.palette.stance).toBe("diverging");
    expect(manifest.dimensions.palette.reason).toBe("intentional rebrand");
    expect(manifest.dimensions.spacing.stance).toBe("accepted");
  });

  it("preserves existing acks for unaffected dimensions", async () => {
    const parent = makeFingerprint({ id: "parent" });
    const child = makeFingerprint({ id: "child" });

    // First ack: all accepted
    await acknowledge({
      child,
      parent,
      parentRef: { type: "default" },
      cwd: tempDir,
    });

    // Second ack: only palette changed to diverging
    const { manifest } = await acknowledge({
      child,
      parent,
      parentRef: { type: "default" },
      dimension: "palette",
      stance: "diverging",
      cwd: tempDir,
    });

    expect(manifest.dimensions.palette.stance).toBe("diverging");
    expect(manifest.dimensions.spacing.stance).toBe("accepted");
  });

  it("records overall distance", async () => {
    const parent = makeFingerprint({ id: "parent" });
    const child = makeDriftedFingerprint(parent, {
      id: "child",
      palette: {
        dominant: [{ role: "accent", value: "#ff0000", oklch: [0.6, 0.3, 30] }],
      },
    });

    const { manifest } = await acknowledge({
      child,
      parent,
      parentRef: { type: "default" },
      cwd: tempDir,
    });

    expect(manifest.overallDistance).toBeGreaterThan(0);
  });
});

describe("checkBounds", () => {
  const now = new Date().toISOString();

  function makeManifestWithAcks(
    distances: Record<string, number>,
    stances?: Record<string, "aligned" | "accepted" | "diverging">,
  ): SyncManifest {
    const dimensions: SyncManifest["dimensions"] = {};
    for (const [key, distance] of Object.entries(distances)) {
      dimensions[key] = {
        distance,
        stance: stances?.[key] ?? "accepted",
        ackedAt: now,
      };
    }
    return {
      parent: { type: "default" },
      ackedAt: now,
      parentFingerprintId: "p",
      childFingerprintId: "c",
      dimensions,
      overallDistance: 0,
    };
  }

  it("returns exceeded=false when within tolerance", () => {
    const manifest = makeManifestWithAcks({ palette: 0.2, spacing: 0.1 });
    const comparison = {
      dimensions: {
        palette: { dimension: "palette", distance: 0.22, description: "" },
        spacing: { dimension: "spacing", distance: 0.12, description: "" },
      },
    } as unknown as FingerprintComparison;

    const result = checkBounds(manifest, comparison);
    expect(result.exceeded).toBe(false);
  });

  it("returns exceeded=true when distance exceeds ack + tolerance", () => {
    const manifest = makeManifestWithAcks({ palette: 0.1 });
    const comparison = {
      dimensions: {
        palette: { dimension: "palette", distance: 0.5, description: "" },
      },
    } as unknown as FingerprintComparison;

    const result = checkBounds(manifest, comparison);
    expect(result.exceeded).toBe(true);
    expect(result.dimensions).toContain("palette");
  });

  it("skips dimensions with 'diverging' stance", () => {
    const manifest = makeManifestWithAcks(
      { palette: 0.1 },
      { palette: "diverging" },
    );
    const comparison = {
      dimensions: {
        palette: { dimension: "palette", distance: 0.9, description: "" },
      },
    } as unknown as FingerprintComparison;

    const result = checkBounds(manifest, comparison);
    expect(result.exceeded).toBe(false);
    expect(result.dimensions).toHaveLength(0);
  });
});
