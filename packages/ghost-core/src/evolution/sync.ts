import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { compareFingerprints } from "../embedding/compare.js";
import type {
  DimensionAck,
  DimensionStance,
  Expression,
  ExpressionComparison,
  SyncManifest,
  Target,
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
  child: Expression;
  parent: Expression;
  parentRef: Target;
  dimension?: string;
  stance?: DimensionStance;
  reason?: string;
  tolerance?: number;
  cwd?: string;
}): Promise<{ manifest: SyncManifest; comparison: ExpressionComparison }> {
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
      const stance = opts.stance ?? "accepted";
      dimensions[key] = {
        distance: delta.distance,
        stance,
        ackedAt: now,
        reason: key === opts.dimension ? opts.reason : undefined,
        tolerance: key === opts.dimension ? opts.tolerance : undefined,
        divergedAt: stance === "diverging" ? now : undefined,
      };
    }
  }

  const manifest: SyncManifest = {
    parent: opts.parentRef,
    ackedAt: now,
    parentExpressionId: opts.parent.id,
    childExpressionId: opts.child.id,
    dimensions,
    overallDistance: comparison.distance,
  };

  await writeSyncManifest(manifest, cwd);

  return { manifest, comparison };
}

export interface CheckBoundsOptions {
  tolerance?: number;
  maxDivergenceDays?: number;
}

/**
 * Check whether the current drift exceeds the acknowledged bounds.
 * Returns dimensions that have drifted beyond what was acked.
 *
 * Improvements over the original:
 * - Per-dimension tolerance (ack.tolerance overrides global tolerance)
 * - Diverging dimensions are re-evaluated: if they've reconverged significantly
 *   (current distance < 50% of acked distance), they're flagged as "reconverging"
 * - Optional maxDivergenceDays: flags diverging dimensions that have been diverging
 *   longer than the specified number of days
 */
export function checkBounds(
  manifest: SyncManifest,
  current: ExpressionComparison,
  toleranceOrOptions?: number | CheckBoundsOptions,
): { exceeded: boolean; dimensions: string[]; reconverging: string[] } {
  const opts: CheckBoundsOptions =
    typeof toleranceOrOptions === "number"
      ? { tolerance: toleranceOrOptions }
      : (toleranceOrOptions ?? {});

  const globalTolerance = opts.tolerance ?? 0.05;
  const maxDivergenceDays = opts.maxDivergenceDays ?? null;

  const exceeded: string[] = [];
  const reconverging: string[] = [];

  for (const [key, ack] of Object.entries(manifest.dimensions)) {
    const currentDistance = current.dimensions[key]?.distance ?? 0;
    const effectiveTolerance = ack.tolerance ?? globalTolerance;

    if (ack.stance === "diverging") {
      // Re-evaluate diverging dimensions instead of permanently skipping them
      // If the dimension has converged back to less than 50% of acked distance, flag it
      if (currentDistance < ack.distance * 0.5) {
        reconverging.push(key);
      }
      // If maxDivergenceDays is set, check if divergence has gone on too long
      if (maxDivergenceDays !== null && ack.divergedAt) {
        const divergedDate = new Date(ack.divergedAt);
        const daysSinceDiverged = Math.floor(
          (Date.now() - divergedDate.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (daysSinceDiverged > maxDivergenceDays) {
          exceeded.push(key);
        }
      }
      continue;
    }

    if (currentDistance > ack.distance + effectiveTolerance) {
      exceeded.push(key);
    }
  }

  return {
    exceeded: exceeded.length > 0,
    dimensions: exceeded,
    reconverging,
  };
}
