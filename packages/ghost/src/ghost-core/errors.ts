/**
 * The CLI exit-code contract, in one place so every command agrees and an agent
 * can branch on the code:
 *
 * - `0` success
 * - `1` ran, but unhappy: a lint/validate finding, or an unexpected error
 * - `2` called wrong: a bad flag or argument, a missing package, an unknown
 *   node or surface
 * - `3` a command-specific refusal (e.g. `skill install` without `--force`)
 *
 * Usage errors (`2`) are often surfaced by throwing from deep in a helper
 * (path validation, byte budgets, overwrite guards). Throwing `UsageError`
 * instead of a plain `Error` lets the shared catch tell those apart from a
 * genuine crash, so the contract holds without each call site picking a code.
 */
export const EXIT = {
  ok: 0,
  failure: 1,
  usage: 2,
} as const;

/**
 * A caller-facing "you used it wrong" error: bad flag or argument, missing
 * package, invalid environment, or a refused overwrite. Reported at exit code
 * 2, distinct from an unexpected crash (1).
 */
export class UsageError extends Error {
  readonly exitCode = EXIT.usage;
  constructor(message: string) {
    super(message);
    this.name = "UsageError";
  }
}
