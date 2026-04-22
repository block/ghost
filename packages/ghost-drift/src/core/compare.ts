import { compareFingerprints } from "./embedding/compare.js";
import { compareComposite } from "./evolution/composite.js";
import { computeTemporalComparison } from "./evolution/temporal.js";
import type { SemanticDiff } from "./fingerprint/diff.js";
import { diffFingerprints } from "./fingerprint/diff.js";
import type {
  CompositeComparison,
  CompositeMember,
  Fingerprint,
  FingerprintComparison,
  FingerprintHistoryEntry,
  SyncManifest,
  TemporalComparison,
} from "./types.js";

export interface CompareOptions {
  /** Include a qualitative semantic diff. N=2 only. */
  semantic?: boolean;
  /** Enrich with drift velocity, trajectory, ack status. N=2 only. */
  history?: FingerprintHistoryEntry[];
  /** Companion to `history` — the ack manifest, if any. */
  manifest?: SyncManifest | null;
  /** Explicit member ids for composite mode. Defaults to `fingerprint.id`. */
  ids?: string[];
}

export type CompareResult =
  | {
      mode: "pairwise";
      comparison: FingerprintComparison;
      semantic?: SemanticDiff;
      temporal?: TemporalComparison;
    }
  | {
      mode: "composite";
      composite: CompositeComparison;
    };

/**
 * Unified fingerprint comparison.
 *
 *   • N=2              → pairwise (distance + per-dimension delta).
 *   • N=2 + semantic   → adds a qualitative diff (what decisions/colors changed).
 *   • N=2 + history    → adds velocity, trajectory, ack bounds.
 *   • N≥3              → composite (pairwise matrix, centroid, spread, clusters).
 *
 * Rejects semantic/temporal in composite mode — both are pairwise concepts.
 */
export function compare(
  fingerprints: Fingerprint[],
  options: CompareOptions = {},
): CompareResult {
  if (fingerprints.length < 2) {
    throw new Error("compare requires at least 2 fingerprints.");
  }

  if (fingerprints.length >= 3) {
    if (options.semantic || options.history) {
      throw new Error(
        "semantic and temporal require exactly 2 fingerprints (pairwise mode).",
      );
    }
    const ids = options.ids;
    const members: CompositeMember[] = fingerprints.map((fingerprint, i) => ({
      id: ids?.[i] ?? fingerprint.id,
      fingerprint,
    }));
    return {
      mode: "composite",
      composite: compareComposite(members, { cluster: true }),
    };
  }

  const [a, b] = fingerprints;
  const comparison = compareFingerprints(a, b);

  const semantic = options.semantic ? diffFingerprints(a, b) : undefined;
  const temporal =
    options.history !== undefined
      ? computeTemporalComparison({
          comparison,
          history: options.history,
          manifest: options.manifest ?? null,
        })
      : undefined;

  return {
    mode: "pairwise",
    comparison,
    ...(semantic ? { semantic } : {}),
    ...(temporal ? { temporal } : {}),
  };
}
