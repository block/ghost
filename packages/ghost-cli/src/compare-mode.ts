/**
 * Pure mode-selection logic for `ghost compare`. Dispatched by flags + N args.
 *
 * Kept separate from the CLI handler so it can be unit-tested without
 * invoking cac or touching the filesystem.
 */

export type CompareMode = "fleet" | "semantic" | "temporal" | "pairwise";

export type CompareDispatch =
  | { ok: true; mode: CompareMode }
  | { ok: false; error: string };

export interface CompareModeInput {
  expressionCount: number;
  cluster?: boolean;
  semantic?: boolean;
  temporal?: boolean;
}

/**
 * Decide which compare mode to run given the flags + positional count.
 * Precedence:
 *   1. Requires N ≥ 2
 *   2. Fleet if N ≥ 3 or --cluster (rejects --temporal / --semantic)
 *   3. --semantic (N=2, rejects --temporal)
 *   4. --temporal (N=2)
 *   5. default pairwise
 */
export function selectCompareMode(input: CompareModeInput): CompareDispatch {
  if (input.expressionCount < 2) {
    return {
      ok: false,
      error: "compare requires at least 2 expression paths.",
    };
  }

  if (input.expressionCount >= 3 || input.cluster) {
    if (input.temporal || input.semantic) {
      return {
        ok: false,
        error: "--temporal and --semantic require exactly 2 expressions.",
      };
    }
    return { ok: true, mode: "fleet" };
  }

  if (input.semantic) {
    if (input.temporal) {
      return {
        ok: false,
        error: "--semantic and --temporal are mutually exclusive.",
      };
    }
    return { ok: true, mode: "semantic" };
  }

  if (input.temporal) {
    return { ok: true, mode: "temporal" };
  }

  return { ok: true, mode: "pairwise" };
}
