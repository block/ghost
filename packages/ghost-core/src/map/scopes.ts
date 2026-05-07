import type { MapFrontmatter, MapScope } from "./schema.js";

export type MapFeatureArea = MapFrontmatter["feature_areas"][number];

/**
 * Slugify a human feature-area name into the scope id shape accepted by
 * `ghost.map/v2`. Existing slug ids stay unchanged.
 */
export function slugifyScopeId(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[^a-z0-9]+/, "")
    .replace(/-+/g, "-")
    .replace(/-$/g, "");
  return slug.length > 0 ? slug : "scope";
}

/**
 * Return the product-surface scopes that govern scoped fingerprints.
 *
 * New maps can declare `scopes[]` directly. Older maps derive the same
 * effective shape from `feature_areas[]`, preserving existing scan recipes
 * and fleet manifests.
 */
export function getEffectiveMapScopes(
  map: Pick<MapFrontmatter, "scopes" | "feature_areas">,
): MapScope[] {
  if (map.scopes && map.scopes.length > 0) {
    return map.scopes.map(cloneScope);
  }

  return map.feature_areas.map((area) => ({
    id: slugifyScopeId(area.name),
    name: area.name,
    kind: "feature-area",
    paths: [...area.paths],
    ...(area.sub_areas ? { sub_areas: [...area.sub_areas] } : {}),
  }));
}

function cloneScope(scope: MapScope): MapScope {
  return {
    ...scope,
    paths: [...scope.paths],
    ...(scope.sub_areas ? { sub_areas: [...scope.sub_areas] } : {}),
  };
}
