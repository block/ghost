import type { GhostCheck, RoutedGhostValidateCheck } from "./types.js";

export function normalizeGhostPath(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\.\//, "");
}

export function matchesGhostPath(path: string, scopePath: string): boolean {
  const changedPath = normalizeGhostPath(path);
  const pattern = normalizeGhostPath(scopePath);
  if (pattern.includes("*")) {
    return globToRegExp(pattern).test(changedPath);
  }

  const normalized = pattern.replace(/\/$/, "");
  return changedPath === normalized || changedPath.startsWith(`${normalized}/`);
}

/**
 * Route active checks to a changed path by `applies_to.paths` alone.
 *
 * Phase 4: the map scope layer is gone. Surface-based routing is rebuilt in
 * Phase 7; until then a check applies if it declares no paths (global) or one
 * of its path globs matches the changed file.
 */
export function routeGhostValidateForPath(
  checks: GhostCheck[],
  changedPath: string,
): RoutedGhostValidateCheck[] {
  return checks
    .filter((check) => check.status === "active")
    .flatMap((check) => {
      const applies = check.applies_to;
      const pathMatched =
        !applies?.paths?.length ||
        applies.paths.some((pattern) => matchesGhostPath(changedPath, pattern));
      return pathMatched ? [{ check }] : [];
    });
}

function globToRegExp(glob: string): RegExp {
  let out = "^";
  for (let i = 0; i < glob.length; i++) {
    const char = glob[i];
    const next = glob[i + 1];
    if (char === "*" && next === "*") {
      out += ".*";
      i += 1;
    } else if (char === "*") {
      out += "[^/]*";
    } else {
      out += escapeRegExp(char);
    }
  }
  out += "$";
  return new RegExp(out);
}

function escapeRegExp(value: string): string {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}
