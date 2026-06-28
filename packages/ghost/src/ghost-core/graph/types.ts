import type { GhostNodeRelation } from "../node/types.js";
import { GHOST_SURFACE_ROOT_ID } from "../surfaces/types.js";

/** The implicit root every node ultimately descends from (shared with surfaces). */
export const GHOST_GRAPH_ROOT_ID = GHOST_SURFACE_ROOT_ID;

/**
 * Where a node in the resolved graph came from. The fold unions authored
 * on-disk node files with a transition projection of the legacy facet model;
 * `origin` records which, so later phases and lint can treat them differently
 * (and so the projection can be deleted cleanly in the facet-removal phase).
 */
export type GhostGraphNodeOrigin = "node-file" | "inherited";

/**
 * A resolved graph node — pure prose (Option A). The body is the design
 * expression; there are no structured node fields. `under` is the single
 * containment parent (absent ⇒ child of the implicit `core` root); `relates`
 * are the typed lateral links; `incarnation` is the optional projection tag.
 */
export interface GhostGraphNode {
  id: string;
  under?: string;
  relates: GhostNodeRelation[];
  incarnation?: string;
  body: string;
  origin: GhostGraphNodeOrigin;
}

/**
 * The in-memory fingerprint graph: prose nodes indexed by id, plus the
 * containment tree (`under` parent edges, root = `core`) that is the traversal
 * spine. This is the shape later phases (gather, checks, compare) traverse;
 * disk layout is just one serialization of it.
 */
export interface GhostGraph {
  /** Every node, indexed by id. */
  nodes: Map<string, GhostGraphNode>;
  /** child id → parent id (the `under` tree). The root has no entry. */
  parents: Map<string, string>;
  /** parent id → child ids, for downward traversal. */
  children: Map<string, string[]>;
}
