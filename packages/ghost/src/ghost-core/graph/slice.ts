import type { GhostNodeRelationKind } from "../node/types.js";
import { ancestorChain } from "./assemble.js";
import { GHOST_GRAPH_ROOT_ID, type GhostGraph } from "./types.js";

/**
 * Why a node is present in a resolved slice.
 * - `own`: placed directly on the requested surface.
 * - `ancestor`: placed on an ancestor and cascaded down the tree.
 * - `edge`: contributed by a typed `relates` link from a slice node (one hop).
 */
export type GraphSliceProvenance =
  | { kind: "own" }
  | { kind: "ancestor"; from: string }
  | { kind: "edge"; via?: GhostNodeRelationKind; from: string };

export interface GraphSliceNode {
  id: string;
  body: string;
  incarnation?: string;
  provenance: GraphSliceProvenance;
}

export interface GraphSlice {
  /** The requested node/surface id. */
  surface: string;
  /** Ancestor chain from the surface up to (but excluding) the implicit root. */
  ancestors: string[];
  /** The `--as` incarnation filter applied, if any. */
  incarnation?: string;
  nodes: GraphSliceNode[];
}

export interface ResolveGraphSliceOptions {
  /** Filter to nodes whose incarnation matches, plus essence (untagged) nodes. */
  incarnation?: string;
}

/**
 * Compose a context slice for a surface by traversing the graph, deterministic
 * and with no I/O or LLM:
 *
 * - own: nodes placed directly on the requested id;
 * - ancestor: nodes on each `under` ancestor up to `core` cascade down;
 * - edge: for each slice node's `relates`, the target node's body is included
 *   once (one hop, no recursion), tagged by the relation qualifier.
 *
 * The `incarnation` option filters: a node with no incarnation (essence) is
 * always included; a tagged node is included only when it matches; absent
 * option means no filtering.
 */
export function resolveGraphSlice(
  graph: GhostGraph,
  surfaceId: string,
  options: ResolveGraphSliceOptions = {},
): GraphSlice {
  const ancestorsFull = ancestorChain(graph, surfaceId);
  // Exclude the implicit root from the reported chain (parity with the old
  // resolver, which reported up to but not labeling core specially); keep it in
  // the cascade set so root/essence nodes still cascade.
  const ancestors = ancestorsFull.filter((id) => id !== GHOST_GRAPH_ROOT_ID);

  const cascadeIds = new Set<string>([
    surfaceId,
    ...ancestorsFull,
    GHOST_GRAPH_ROOT_ID,
  ]);

  const passesIncarnation = (incarnation?: string): boolean => {
    if (options.incarnation === undefined) return true;
    if (incarnation === undefined || incarnation === "any") return true;
    return incarnation === options.incarnation;
  };

  const slice: GraphSlice = {
    surface: surfaceId,
    ancestors,
    ...(options.incarnation !== undefined
      ? { incarnation: options.incarnation }
      : {}),
    nodes: [],
  };

  const seen = new Set<string>();
  const add = (id: string, provenance: GraphSliceProvenance) => {
    if (seen.has(id)) return;
    const node = graph.nodes.get(id);
    if (!node) return;
    if (!passesIncarnation(node.incarnation)) return;
    seen.add(id);
    slice.nodes.push({
      id: node.id,
      body: node.body,
      ...(node.incarnation !== undefined
        ? { incarnation: node.incarnation }
        : {}),
      provenance,
    });
  };

  // Placement of a node: nodes attach to a surface via `under`; nodes whose id
  // *is* a surface in the cascade are themselves placed there. We resolve
  // placement as: a node belongs to surface S if its containment parent chain
  // reaches S directly (its `under` is S), or the node id equals S.
  const placementOf = (nodeId: string, nodeUnder?: string): string =>
    nodeUnder ?? GHOST_GRAPH_ROOT_ID;

  // Own + ancestor: walk every node, place it, decide provenance by cascade.
  for (const node of graph.nodes.values()) {
    const placement =
      node.id === surfaceId ? surfaceId : placementOf(node.id, node.under);
    if (placement === surfaceId || node.id === surfaceId) {
      add(node.id, { kind: "own" });
    } else if (cascadeIds.has(placement)) {
      add(node.id, { kind: "ancestor", from: placement });
    }
  }

  // Edge contributions: one hop along `relates` from the nodes already in the
  // slice. The target's body is included, tagged by qualifier.
  const ownAndAncestor = [...slice.nodes];
  for (const sliceNode of ownAndAncestor) {
    const source = graph.nodes.get(sliceNode.id);
    if (!source) continue;
    for (const relation of source.relates) {
      // Local refs only in Phase 3; cross-package (`pkg#id`) is a later phase.
      if (relation.to.includes("#")) continue;
      add(relation.to, {
        kind: "edge",
        ...(relation.as !== undefined ? { via: relation.as } : {}),
        from: sliceNode.id,
      });
    }
  }

  return slice;
}
