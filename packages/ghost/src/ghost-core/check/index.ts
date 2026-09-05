/**
 * Public surface for `ghost.check/v1` — markdown + frontmatter checks an agent
 * evaluates (ghost never runs them). Every check is offered to the reviewer;
 * the agent judges relevance against the diff and the grounded prose.
 */

export { lintGhostCheck } from "./lint.js";
export { loadGhostCheck } from "./load.js";
export { type ParsedCheckMarkdown, parseCheckMarkdown } from "./parse.js";
export {
  type ParsedCheckReference,
  parseCheckReference,
  sliceNodeSection,
} from "./reference.js";
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
