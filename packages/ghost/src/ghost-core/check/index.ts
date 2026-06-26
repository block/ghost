/**
 * Public surface for `ghost.check/v1` — markdown + frontmatter checks an agent
 * evaluates (Ghost never runs them). Ghost routes them by surface and grounds
 * their findings in the fingerprint. See docs/ideas/phase-7b-grounded-checks.md.
 */

export { lintGhostCheck } from "./lint.js";
export { loadGhostCheck } from "./load.js";
export { type ParsedCheckMarkdown, parseCheckMarkdown } from "./parse.js";
export {
  type CheckRelevance,
  type RoutedCheck,
  selectChecksForSurfaces,
} from "./route.js";
export {
  GHOST_CHECK_SCHEMA,
  GHOST_CHECK_SEVERITIES,
  type GhostCheckDocument,
  type GhostCheckFrontmatter,
  type GhostCheckLintIssue,
  type GhostCheckLintReport,
  type GhostCheckLintSeverity,
  type GhostCheckMarkdownSeverity,
} from "./types.js";
