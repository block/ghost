import {
  getEffectiveMapScopes,
  type MapFrontmatter,
  type MapScope,
} from "../map/index.js";
import type { GhostCheck, RoutedGhostCheck } from "./types.js";

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

export function routeGhostPathToScopes(
  map: Pick<MapFrontmatter, "scopes" | "feature_areas">,
  changedPath: string,
): MapScope[] {
  const scopes = getEffectiveMapScopes(map).sort(compareScopeSpecificity);
  return scopes.filter((scope) =>
    scope.paths.some((pattern) => matchesGhostPath(changedPath, pattern)),
  );
}

export function routeGhostChecksForPath(
  checks: GhostCheck[],
  map: Pick<MapFrontmatter, "scopes" | "feature_areas">,
  changedPath: string,
): RoutedGhostCheck[] {
  const matchedScopes = routeGhostPathToScopes(map, changedPath);
  return checks
    .filter((check) => check.status === "active")
    .flatMap((check) => {
      const applies = check.applies_to;
      if (!applies) return [{ check, matched_scopes: matchedScopes }];

      const pathMatched =
        !applies.paths?.length ||
        applies.paths.some((pattern) => matchesGhostPath(changedPath, pattern));
      const scopeMatched =
        !applies.scopes?.length ||
        matchedScopes.some((scope) => applies.scopes?.includes(scope.id));

      return pathMatched && scopeMatched
        ? [{ check, matched_scopes: matchedScopes }]
        : [];
    });
}

function compareScopeSpecificity(a: MapScope, b: MapScope): number {
  const aMax = Math.max(...a.paths.map((path) => path.length));
  const bMax = Math.max(...b.paths.map((path) => path.length));
  return bMax - aMax || a.id.localeCompare(b.id);
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
