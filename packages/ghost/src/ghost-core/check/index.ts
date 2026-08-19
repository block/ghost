/**
 * Public surface for `ghost.check/v2`: markdown + frontmatter checks an agent
 * evaluates. Checks are grounded review assertions that cite guidance nodes.
 */

export {
  type ParsedGuidanceRef,
  parseGuidanceRef,
  sliceNodeSection,
} from "./guidance-ref.js";
export { lintGhostCheck } from "./lint.js";
export { loadGhostCheck } from "./load.js";
export { type ParsedCheckMarkdown, parseCheckMarkdown } from "./parse.js";
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
