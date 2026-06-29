/**
 * Public surface for `ghost.binding/v1` — the repo-native statement that a
 * working tree realizes a contract's surfaces at given paths. See
 * docs/ideas/surface-binding.md.
 */

export { lintGhostBinding } from "./lint.js";
export {
  type BindingCandidate,
  type PathResolution,
  type PathResolutionReason,
  resolvePathToSurface,
} from "./resolve.js";
export { GhostBindingSchema } from "./schema.js";
export {
  GHOST_BINDING_FILENAME,
  GHOST_BINDING_SCHEMA,
  type GhostBindingDocument,
  type GhostBindingEntry,
  type GhostBindingLintIssue,
  type GhostBindingLintReport,
  type GhostBindingLintSeverity,
} from "./types.js";
