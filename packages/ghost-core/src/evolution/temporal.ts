import { compareFingerprints } from "../fingerprint/compare.js";
import type {
  DriftVelocity,
  FingerprintComparison,
  FingerprintHistoryEntry,
  SyncManifest,
  TemporalComparison,
} from "../types.js";
import { checkBounds } from "./sync.js";
import { computeDriftVectors } from "./vector.js";

/**
 * Enrich a fingerprint comparison with temporal data:
 * velocity, trajectory, ack status, and drift vectors.
 */
export function computeTemporalComparison(opts: {
  comparison: FingerprintComparison;
  history: FingerprintHistoryEntry[];
  manifest: SyncManifest | null;
}): TemporalComparison {
  const { comparison, history, manifest } = opts;

  const vectors = computeDriftVectors(comparison.source, comparison.target);
  const velocity = computeVelocity(comparison, history);
  const trajectory = classifyTrajectory(velocity);

  let daysSinceAck: number | null = null;
  let exceedsAckedBounds = false;
  let exceedingDimensions: string[] = [];

  if (manifest) {
    const ackDate = new Date(manifest.ackedAt);
    daysSinceAck = Math.floor(
      (Date.now() - ackDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    const bounds = checkBounds(manifest, comparison);
    exceedsAckedBounds = bounds.exceeded;
    exceedingDimensions = bounds.dimensions;
  }

  return {
    ...comparison,
    vectors,
    velocity,
    daysSinceAck,
    exceedsAckedBounds,
    exceedingDimensions,
    trajectory,
  };
}

/**
 * Compute drift velocity per dimension from history entries.
 * Uses the oldest and most recent entries to calculate rate of change.
 */
function computeVelocity(
  current: FingerprintComparison,
  history: FingerprintHistoryEntry[],
): DriftVelocity[] {
  if (history.length < 2) {
    // Not enough history to compute velocity — return stable for all dimensions
    return Object.keys(current.dimensions).map((dimension) => ({
      dimension,
      rate: 0,
      direction: "stable" as const,
      windowDays: 0,
    }));
  }

  const oldest = history[0];
  const newest = history[history.length - 1];

  const oldestDate = new Date(oldest.fingerprint.timestamp);
  const newestDate = new Date(newest.fingerprint.timestamp);
  const windowDays = Math.max(
    (newestDate.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24),
    1,
  );

  // Compare the oldest history entry's fingerprint against the current source
  // to get a "then" comparison, and use the current comparison as "now"
  const oldComparison = compareFingerprints(current.source, oldest.fingerprint);

  return Object.keys(current.dimensions).map((dimension) => {
    const oldDistance = oldComparison.dimensions[dimension]?.distance ?? 0;
    const newDistance = current.dimensions[dimension]?.distance ?? 0;
    const delta = newDistance - oldDistance;
    const rate = Math.abs(delta) / windowDays;

    let direction: "converging" | "diverging" | "stable";
    if (Math.abs(delta) < 0.01) {
      direction = "stable";
    } else if (delta < 0) {
      direction = "converging";
    } else {
      direction = "diverging";
    }

    return { dimension, rate, direction, windowDays };
  });
}

/**
 * Classify overall trajectory from per-dimension velocities.
 */
function classifyTrajectory(
  velocity: DriftVelocity[],
): "converging" | "diverging" | "stable" | "oscillating" {
  if (velocity.length === 0) return "stable";

  const converging = velocity.filter(
    (v) => v.direction === "converging",
  ).length;
  const diverging = velocity.filter((v) => v.direction === "diverging").length;
  const stable = velocity.filter((v) => v.direction === "stable").length;
  const total = velocity.length;

  // If most dimensions are stable, overall is stable
  if (stable / total >= 0.6) return "stable";
  // If dimensions are split between converging and diverging, it's oscillating
  if (
    converging > 0 &&
    diverging > 0 &&
    Math.abs(converging - diverging) <= 1
  ) {
    return "oscillating";
  }
  // Otherwise, majority wins
  return converging > diverging ? "converging" : "diverging";
}
