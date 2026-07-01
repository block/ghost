import type { GhostNodeRelation } from "../node/types.js";

/**
 * The implicit root every node ultimately descends from. A package-root
 * `index.md` *is* this node's prose; otherwise it exists implicitly and never
 * needs to be declared.
 */
export const GHOST_GRAPH_ROOT_ID = "core";

/**
 * A resolved graph node — pure prose (Option A). The body is the design
 * expression; there are no structured node fields. `id` is the node's path in
 * the package; `relates` are the typed lateral links.
 *
 * Containment is not stored: a node's parent is `parentIdOrRoot(id)` and its
 * ancestor chain is a pure walk over the id string. The `folder` axis is the
 * one spatial truth the slice engine runs on.
 */
export interface GhostGraphNode {
  id: string;
  /** One-line "what this is / when to gather it" — the retrieval payload. */
  description?: string;
  /**
   * The node's **file folder**: the directory the source file physically sits
   * in, the single unit of containment for slice composition. An index node's
   * folder is its own id (`features/bitcoin/index.md` → `features/bitcoin`); a
   * leaf's folder is the directory it sits in (`features/bitcoin/buy.md` →
   * `features/bitcoin`). The root `core` node has folder `""`. A node only
   * cascades into surfaces whose folder path includes this folder.
   */
  folder: string;
  relates: GhostNodeRelation[];
  body: string;
}

/**
 * The in-memory fingerprint graph: prose nodes indexed by id. Containment is
 * not materialized as a second structure — parent and ancestor facts are
 * derived from ids on demand (`parentIdOrRoot`, `ancestorChain`), and the slice
 * engine traverses the `folder` axis. The directory layout is the graph.
 */
export interface GhostGraph {
  /** Every node, indexed by id. */
  nodes: Map<string, GhostGraphNode>;
}
