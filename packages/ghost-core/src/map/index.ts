/**
 * Public surface for `ghost.map/v2` schema and types.
 *
 * `map.md` is retained for legacy/cache workflows. The schema/types live here
 * so any ghost tool that reads a legacy map can do so via `@ghost/core`.
 */

export {
  type MapFrontmatter,
  MapFrontmatterSchema,
  type MapScope,
  MapScopeSchema,
  REQUIRED_BODY_SECTIONS,
  type RequiredBodySection,
} from "./schema.js";
export type { MapFeatureArea } from "./scopes.js";
export { getEffectiveMapScopes, slugifyScopeId } from "./scopes.js";
export type {
  GitInfo,
  InventoryOutput,
  LanguageHistogramEntry,
  TopLevelEntry,
} from "./types.js";

export const MAP_FILENAME = "map.md";
