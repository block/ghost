import type { GhostNodeRelation } from "../node/types.js";

/**
 * The implicit root every node ultimately descends from. A package-root
 * `index.md` *is* this node's prose; otherwise it exists implicitly and never
 * needs to be declared.
 */
export const GHOST_GRAPH_ROOT_ID = "core";

/**
 * Where a node in the resolved graph came from. A local node is read from the
 * package's own directory tree (its path is its id, its directory its parent);
 * an inherited node is read-only context pulled in by `extends`. `origin`
 * records which, so later phases and lint can treat them differently.
 */
export type GhostGraphNodeOrigin = "node-file" | "inherited";

/**
 * A resolved graph node — pure prose (Option A). The body is the design
 * expression; there are no structured node fields. `id` is the node's path in
 * the package; `parent` is its containing directory — the single containment
 * parent (absent ⇒ the implicit `core` root itself); `relates` are the typed
 * lateral links; `incarnation` is the optional projection tag.
 */
export interface GhostGraphNode {
  id: string;
  /** One-line "what this is / when to gather it" — the retrieval payload. */
  description?: string;
  /** The containing directory's id; absent ⇒ this node is the `core` root. */
  parent?: string;
  /**
   * The node's **file folder**: the directory the source file physically sits
   * in, the unit of containment for slice composition. This differs from
   * `parent` for index nodes: `features/bitcoin/index.md` has folder
   * `features/bitcoin` but parent `features`. A plain leaf shares its parent's
   * value (`features/bitcoin/buy.md` → folder `features/bitcoin`). The root
   * `core` node has folder `""`. A node only cascades into surfaces whose
   * folder path includes this folder.
   */
  folder: string;
  relates: GhostNodeRelation[];
  incarnation?: string;
  body: string;
  origin: GhostGraphNodeOrigin;
}

/**
 * The in-memory fingerprint graph: prose nodes indexed by id, plus the
 * containment tree (parent edges from the directory layout, root = `core`) that
 * is traversed. This is the shape later phases (gather, checks,
 * review) traverse; the directory layout is just one serialization of it.
 */
export interface GhostGraph {
  /** Every node, indexed by id. */
  nodes: Map<string, GhostGraphNode>;
  /** child id → parent id (the `under` tree). The root has no entry. */
  parents: Map<string, string>;
  /** parent id → child ids, for downward traversal. */
  children: Map<string, string[]>;
}
