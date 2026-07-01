/**
 * Public surface for the in-memory fingerprint graph — the only fingerprint
 * model. The graph is folded from the package's directory tree of prose nodes,
 * and is what every consumer traverses (gather, checks, validate).
 */

export {
  type AssembleGraphInput,
  ancestorChain,
  assembleGraph,
  type PlacedNode,
  parentIdOf,
  parentIdOrRoot,
} from "./assemble.js";
export { closestIds } from "./closest.js";
export {
  type GraphLintIssue,
  type GraphLintReport,
  type GraphLintSeverity,
  lintGraph,
} from "./lint.js";
export { buildGraphMenu, type GraphMenuEntry } from "./menu.js";
export {
  type GraphSlice,
  type GraphSliceNode,
  type GraphSliceProvenance,
  type ResolveGraphSliceOptions,
  resolveGraphSlice,
} from "./slice.js";
export {
  GHOST_GRAPH_ROOT_ID,
  type GhostGraph,
  type GhostGraphNode,
  type GhostGraphNodeOrigin,
} from "./types.js";
