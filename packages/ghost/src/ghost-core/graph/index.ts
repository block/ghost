/**
 * Public surface for the in-memory fingerprint graph (Phase 2). The graph is
 * the shape later phases traverse — gather (Phase 3), checks (Phase 4), compare
 * — assembled by folding authored node files with a transition projection of
 * the legacy facet model. See docs/ideas/phase-2-loader-fold.md.
 */

export {
  type AssembleGraphInput,
  ancestorChain,
  assembleGraph,
} from "./assemble.js";
export { projectFacetsToNodes } from "./project-facets.js";
export {
  GHOST_GRAPH_ROOT_ID,
  type GhostGraph,
  type GhostGraphNode,
  type GhostGraphNodeOrigin,
} from "./types.js";
