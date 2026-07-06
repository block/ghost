/**
 * Public surface for `ghost.check/v1` — markdown + frontmatter checks an agent
 * evaluates. Detector-backed checks can also be run deterministically by
 * `ghost check`; checks without detectors remain agent-evaluated in review.
 */

export { lintGhostCheck } from "./lint.js";
export { loadGhostCheck } from "./load.js";
export { type ParsedCheckMarkdown, parseCheckMarkdown } from "./parse.js";
export {
  type ParsedSourceRef,
  parseSourceRef,
  sliceNodeSection,
} from "./source-ref.js";
export {
  GHOST_CHECK_DETECTOR_TYPES,
  GHOST_CHECK_SCHEMA,
  GHOST_CHECK_SEVERITIES,
  type GhostCheckDetector,
  type GhostCheckDetectorType,
  type GhostCheckDocument,
  type GhostCheckFrontmatter,
  type GhostCheckLintIssue,
  type GhostCheckLintReport,
  type GhostCheckLintSeverity,
  type GhostCheckMarkdownSeverity,
} from "./types.js";
