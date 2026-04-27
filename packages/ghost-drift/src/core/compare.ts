import type {
  CompositeComparison,
  CompositeMember,
  Expression,
  ExpressionComparison,
  ExpressionHistoryEntry,
  SyncManifest,
  TemporalComparison,
} from "@ghost/core";
import { compareExpressions } from "@ghost/core";
import type { SemanticDiff } from "ghost-expression";
import { diffExpressions } from "ghost-expression";
import { compareComposite } from "./evolution/composite.js";
import { computeTemporalComparison } from "./evolution/temporal.js";

export interface CompareOptions {
  /** Include a qualitative semantic diff. N=2 only. */
  semantic?: boolean;
  /** Enrich with drift velocity, trajectory, ack status. N=2 only. */
  history?: ExpressionHistoryEntry[];
  /** Companion to `history` — the ack manifest, if any. */
  manifest?: SyncManifest | null;
  /** Explicit member ids for composite mode. Defaults to `expression.id`. */
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
      mode: "composite";
      composite: CompositeComparison;
    };

/**
 * Unified expression comparison.
 *
 *   • N=2              → pairwise (distance + per-dimension delta).
 *   • N=2 + semantic   → adds a qualitative diff (what decisions/colors changed).
 *   • N=2 + history    → adds velocity, trajectory, ack bounds.
 *   • N≥3              → composite (pairwise matrix, centroid, spread, clusters).
 *
 * Rejects semantic/temporal in composite mode — both are pairwise concepts.
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
    const members: CompositeMember[] = expressions.map((expression, i) => ({
      id: ids?.[i] ?? expression.id,
      expression,
    }));
    return {
      mode: "composite",
      composite: compareComposite(members, { cluster: true }),
    };
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
