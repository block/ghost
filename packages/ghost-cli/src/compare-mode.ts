/**
 * Pure mode-selection logic for `ghost compare`. Dispatched by flags + N args.
 *
 * Kept separate from the CLI handler so it can be unit-tested without
 * invoking cac or touching the filesystem.
 */

export type CompareMode =
  | "components"
  | "fleet"
  | "semantic"
  | "temporal"
  | "pairwise";

export type CompareDispatch =
  | { ok: true; mode: CompareMode }
  | { ok: false; error: string };

export interface CompareModeInput {
  fingerprintCount: number;
  components?: boolean;
  cluster?: boolean;
  semantic?: boolean;
  temporal?: boolean;
}

/**
 * Decide which compare mode to run given the flags + positional count.
 * Precedence:
 *   1. --components (ignores fingerprint args entirely)
 *   2. Requires N ≥ 2 otherwise
 *   3. Fleet if N ≥ 3 or --cluster (rejects --temporal / --semantic)
 *   4. --semantic (N=2, rejects --temporal)
 *   5. --temporal (N=2)
 *   6. default pairwise
 */
export function selectCompareMode(input: CompareModeInput): CompareDispatch {
  if (input.components) {
    return { ok: true, mode: "components" };
  }

  if (input.fingerprintCount < 2) {
    return {
      ok: false,
      error:
        "compare requires at least 2 fingerprint paths (or use --components).",
    };
  }

  if (input.fingerprintCount >= 3 || input.cluster) {
    if (input.temporal || input.semantic) {
      return {
        ok: false,
        error: "--temporal and --semantic require exactly 2 fingerprints.",
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
