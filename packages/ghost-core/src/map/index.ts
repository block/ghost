/**
 * Public surface for `ghost.map/v1` schema and types.
 *
 * Map authoring (`inventory`, `lint`) lives in `ghost-expression` (the tool
 * that owns the recipe). The schema/types live here so any ghost tool that
 * reads `map.md` can do so via `@ghost/core` without depending on the
 * authoring CLI.
 */

export {
  type MapFrontmatter,
  MapFrontmatterSchema,
  REQUIRED_BODY_SECTIONS,
  type RequiredBodySection,
} from "./schema.js";
export type {
  GitInfo,
  InventoryOutput,
  LanguageHistogramEntry,
  TopLevelEntry,
} from "./types.js";

export const MAP_FILENAME = "map.md";
