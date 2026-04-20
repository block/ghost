import { compareExpressions } from "./embedding/compare.js";
import { compareFleet } from "./evolution/fleet.js";
import { computeTemporalComparison } from "./evolution/temporal.js";
import type { SemanticDiff } from "./expression/diff.js";
import { diffExpressions } from "./expression/diff.js";
import type {
  Expression,
  ExpressionComparison,
  ExpressionHistoryEntry,
  FleetComparison,
  FleetMember,
  SyncManifest,
  TemporalComparison,
} from "./types.js";

export interface CompareOptions {
  /** Include a qualitative semantic diff. N=2 only. */
  semantic?: boolean;
  /** Enrich with drift velocity, trajectory, ack status. N=2 only. */
  history?: ExpressionHistoryEntry[];
  /** Companion to `history` — the ack manifest, if any. */
  manifest?: SyncManifest | null;
  /** Explicit member ids for fleet mode. Defaults to `expression.id`. */
  ids?: string[];
}

export type CompareResult =
  | {
      mode: "pairwise";
      comparison: ExpressionComparison;
      semantic?: SemanticDiff;
      temporal?: TemporalComparison;
    }
  | {
      mode: "fleet";
      fleet: FleetComparison;
    };

/**
 * Unified expression comparison.
 *
 *   • N=2              → pairwise (distance + per-dimension delta).
 *   • N=2 + semantic   → adds a qualitative diff (what decisions/colors changed).
 *   • N=2 + history    → adds velocity, trajectory, ack bounds.
 *   • N≥3              → fleet (pairwise matrix, centroid, spread, clusters).
 *
 * Rejects semantic/temporal in fleet mode — both are pairwise concepts.
 */
export function compare(
  expressions: Expression[],
  options: CompareOptions = {},
): CompareResult {
  if (expressions.length < 2) {
    throw new Error("compare requires at least 2 expressions.");
  }

  if (expressions.length >= 3) {
    if (options.semantic || options.history) {
      throw new Error(
        "semantic and temporal require exactly 2 expressions (pairwise mode).",
      );
    }
    const ids = options.ids;
    const members: FleetMember[] = expressions.map((expression, i) => ({
      id: ids?.[i] ?? expression.id,
      expression,
    }));
    return { mode: "fleet", fleet: compareFleet(members, { cluster: true }) };
  }

  const [a, b] = expressions;
  const comparison = compareExpressions(a, b);

  const semantic = options.semantic ? diffExpressions(a, b) : undefined;
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
