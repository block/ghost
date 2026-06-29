import { buildGraphMenu, closestIds, type GhostGraph } from "#ghost-core";

/**
 * The single stable error code the surface-naming commands branch on. When an
 * agent names a surface that is not in the graph, `checks`/`review`/`gather`
 * emit this code with closest-id suggestions, so the agent can self-correct
 * instead of silently routing to nothing.
 */
export const ERR_UNKNOWN_SURFACE = "ERR_UNKNOWN_SURFACE" as const;

export interface UnknownSurface {
  surface: string;
  suggestions: string[];
}

/**
 * Find any named surfaces absent from the graph, each with closest-id
 * suggestions. Empty when every surface resolves. Pure: no I/O, no exit.
 */
export function findUnknownSurfaces(
  graph: GhostGraph,
  surfaces: string[],
): UnknownSurface[] {
  const known = new Set(buildGraphMenu(graph).map((entry) => entry.id));
  const unknown: UnknownSurface[] = [];
  for (const surface of surfaces) {
    if (!known.has(surface)) {
      unknown.push({ surface, suggestions: closestIds(surface, known) });
    }
  }
  return unknown;
}

/**
 * Thrown by library code (e.g. the review packet builder) that cannot itself
 * decide output format or exit. The command catches it and renders via
 * {@link writeUnknownSurfaceError}.
 */
export class UnknownSurfaceError extends Error {
  readonly code = ERR_UNKNOWN_SURFACE;
  constructor(readonly unknown: UnknownSurface[]) {
    super(`unknown surface(s): ${unknown.map((u) => u.surface).join(", ")}`);
    this.name = "UnknownSurfaceError";
  }
}

/** Render an unknown-surface failure in the requested format (no exit). */
export function writeUnknownSurfaceError(
  unknown: UnknownSurface[],
  format: "markdown" | "json",
): void {
  if (format === "json") {
    process.stdout.write(
      `${JSON.stringify(
        {
          error: `unknown surface(s): ${unknown.map((u) => u.surface).join(", ")}`,
          code: ERR_UNKNOWN_SURFACE,
          unknown,
        },
        null,
        2,
      )}\n`,
    );
  } else {
    for (const { surface, suggestions } of unknown) {
      const didYouMean =
        suggestions.length > 0
          ? ` Did you mean: ${suggestions.map((s) => `\`${s}\``).join(", ")}?`
          : "";
      process.stderr.write(
        `Error [${ERR_UNKNOWN_SURFACE}]: unknown surface \`${surface}\`.${didYouMean}\n`,
      );
    }
  }
}

/**
 * Emit the unknown-surface error in the requested format and exit 2. Returns
 * `true` when it handled (and the caller should stop); `false` when every
 * surface is known.
 */
export function guardSurfaces(
  graph: GhostGraph,
  surfaces: string[],
  format: "markdown" | "json",
): boolean {
  const unknown = findUnknownSurfaces(graph, surfaces);
  if (unknown.length === 0) return false;
  writeUnknownSurfaceError(unknown, format);
  process.exit(2);
  return true;
}
