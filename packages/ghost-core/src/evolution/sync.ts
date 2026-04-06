import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { compareFingerprints } from "../fingerprint/compare.js";
import type {
  DesignFingerprint,
  DimensionAck,
  DimensionStance,
  FingerprintComparison,
  ParentSource,
  SyncManifest,
} from "../types.js";

const SYNC_FILENAME = ".ghost-sync.json";

function syncPath(cwd: string): string {
  return resolve(cwd, SYNC_FILENAME);
}

/**
 * Read the sync manifest from .ghost-sync.json.
 * Returns null if no manifest exists.
 */
export async function readSyncManifest(
  cwd: string = process.cwd(),
): Promise<SyncManifest | null> {
  const path = syncPath(cwd);
  if (!existsSync(path)) return null;
  const data = await readFile(path, "utf-8");
  return JSON.parse(data) as SyncManifest;
}

/**
 * Write the sync manifest to .ghost-sync.json.
 */
export async function writeSyncManifest(
  manifest: SyncManifest,
  cwd: string = process.cwd(),
): Promise<string> {
  const path = syncPath(cwd);
  await writeFile(path, JSON.stringify(manifest, null, 2), "utf-8");
  return path;
}

/**
 * Acknowledge the current drift state.
 * Compares child to parent, records per-dimension distances with stances.
 *
 * If dimension/stance are provided, only that dimension is updated —
 * the rest are preserved from the existing manifest or set to "accepted".
 */
export async function acknowledge(opts: {
  child: DesignFingerprint;
  parent: DesignFingerprint;
  parentRef: ParentSource;
  dimension?: string;
  stance?: DimensionStance;
  reason?: string;
  cwd?: string;
}): Promise<{ manifest: SyncManifest; comparison: FingerprintComparison }> {
  const cwd = opts.cwd ?? process.cwd();
  const comparison = compareFingerprints(opts.parent, opts.child);
  const now = new Date().toISOString();

  // Load existing manifest to preserve previous acks
  const existing = await readSyncManifest(cwd);

  const dimensions: Record<string, DimensionAck> = {};

  for (const [key, delta] of Object.entries(comparison.dimensions)) {
    if (opts.dimension && key !== opts.dimension) {
      // Preserve existing ack for this dimension, or default to accepted
      dimensions[key] = existing?.dimensions[key] ?? {
        distance: delta.distance,
        stance: "accepted",
        ackedAt: now,
      };
    } else {
      dimensions[key] = {
        distance: delta.distance,
        stance: opts.stance ?? "accepted",
        ackedAt: now,
        reason: key === opts.dimension ? opts.reason : undefined,
      };
    }
  }

  const manifest: SyncManifest = {
    parent: opts.parentRef,
    ackedAt: now,
    parentFingerprintId: opts.parent.id,
    childFingerprintId: opts.child.id,
    dimensions,
    overallDistance: comparison.distance,
  };

  await writeSyncManifest(manifest, cwd);

  return { manifest, comparison };
}

/**
 * Check whether the current drift exceeds the acknowledged bounds.
 * Returns dimensions that have drifted beyond what was acked.
 */
export function checkBounds(
  manifest: SyncManifest,
  current: FingerprintComparison,
  tolerance: number = 0.05,
): { exceeded: boolean; dimensions: string[] } {
  const exceeded: string[] = [];

  for (const [key, ack] of Object.entries(manifest.dimensions)) {
    if (ack.stance === "diverging") continue; // intentionally diverging, no bound
    const currentDistance = current.dimensions[key]?.distance ?? 0;
    if (currentDistance > ack.distance + tolerance) {
      exceeded.push(key);
    }
  }

  return { exceeded: exceeded.length > 0, dimensions: exceeded };
}
