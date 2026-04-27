/**
 * Public library surface for the `ghost-map` package.
 *
 * Mirrors `ghost-drift`'s `core/index.ts`: a single barrel that consumers
 * import from `ghost-map` (no deep imports required).
 */
export { inventory } from "./inventory.js";
export {
  type LintIssue,
  type LintReport,
  type LintSeverity,
  lintMap,
  MAP_FILENAME,
} from "./lint.js";
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
