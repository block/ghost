import type { GhostNodeRelationKind } from "../node/types.js";
import { ancestorChain, parentIdOrRoot } from "./assemble.js";
import { GHOST_GRAPH_ROOT_ID, type GhostGraph } from "./types.js";

/**
 * Why a full-body node is present in a resolved slice.
 * - `own`: a file in the requested surface's own folder.
 * - `ancestor`: a file in a folder higher on the path (root → surface).
 * - `edge`: contributed by a typed `relates` link from a node on the path (one hop).
 */
export type GraphSliceProvenance =
  | { kind: "own" }
  | { kind: "ancestor"; from: string }
  | { kind: "edge"; via?: GhostNodeRelationKind; from: string };

export interface GraphSliceNode {
  id: string;
  body: string;
  provenance: GraphSliceProvenance;
}

/**
 * A pointer: a node offered as id + description (no body) for the agent to pull
 * on demand. Pointers are navigable optionality, never authoritative context.
 * - `descendant`: a node within or below the requested surface's own subtree.
 * - `related`: a node within or below an `edge` target's subtree (a node the
 *   surface `relates` to offers its subtree as pointers).
 */
export type GraphPointerKind = "descendant" | "related";

export interface GraphSlicePointer {
  id: string;
  description?: string;
  kind: GraphPointerKind;
  /** For a `related` pointer, the `relates` target whose subtree it belongs to. */
  from?: string;
}

export interface GraphSlice {
  /** The requested node/surface id. */
  surface: string;
  /** Ancestor chain from the surface up to (but excluding) the implicit root. */
  ancestors: string[];
  /** Full-body context: every node on the path plus one-hop `relates` edges. */
  nodes: GraphSliceNode[];
  /** Pointers (id + description) the agent may pull: descendants + related subtrees. */
  pointers: GraphSlicePointer[];
}

/**
 * Compose a context slice for a surface by traversing the graph. Deterministic,
 * no I/O, no LLM.
 *
 * - **path nodes** (`own`/`ancestor`): every node whose **file folder** is on
 *   the path from the package root down to the surface's own folder. A sibling
 *   folder's nodes never appear. Path nodes are full bodies.
 * - **edge**: for each path node's `relates`, the target node's body is
 *   included once (one hop, no recursion), tagged by the relation qualifier.
 *   This is how a broad rule placed high in the tree (e.g. "all feature UI
 *   draws on Arcade", authored once on `features`) reaches every descendant.
 * - **pointers**: descendants of the surface's own folder, plus descendants of
 *   each edge target (a related node offers its subtree), as id + description.
 */
export function resolveGraphSlice(
  graph: GhostGraph,
  surfaceId: string,
): GraphSlice {
  const ancestorsFull = ancestorChain(graph, surfaceId);
  const ancestors = ancestorsFull.filter((id) => id !== GHOST_GRAPH_ROOT_ID);

  const surfaceNode = graph.nodes.get(surfaceId);
  // The surface's own file folder anchors the path. For a bare tree position
  // (a directory with no index node) the folder is the id itself.
  const surfaceFolder = surfaceNode?.folder ?? surfaceId;
  const pathFolders = foldersOnPath(surfaceFolder);

  const slice: GraphSlice = {
    surface: surfaceId,
    ancestors,
    nodes: [],
    pointers: [],
  };

  const seenBody = new Set<string>();
  const addBody = (id: string, provenance: GraphSliceProvenance): boolean => {
    if (seenBody.has(id)) return false;
    const node = graph.nodes.get(id);
    if (!node) return false;
    seenBody.add(id);
    slice.nodes.push({
      id: node.id,
      body: node.body,
      provenance,
    });
    return true;
  };

  // Path nodes: every node whose file folder is on the path. `own` when the
  // node sits in the surface's own folder; `ancestor` when higher up.
  for (const node of graph.nodes.values()) {
    if (!pathFolders.has(node.folder)) continue;
    const provenance: GraphSliceProvenance =
      node.folder === surfaceFolder
        ? { kind: "own" }
        : { kind: "ancestor", from: parentIdOrRoot(node.id) };
    addBody(node.id, provenance);
  }

  // Edges: one hop along `relates` from every path node. The target's body is
  // included; the target's subtree is then offered as pointers.
  const pathNodeIds = slice.nodes.map((n) => n.id);
  const edgeTargets: string[] = [];
  for (const sourceId of pathNodeIds) {
    const source = graph.nodes.get(sourceId);
    if (!source) continue;
    for (const relation of source.relates) {
      const added = addBody(relation.to, {
        kind: "edge",
        ...(relation.as !== undefined ? { via: relation.as } : {}),
        from: sourceId,
      });
      if (added) edgeTargets.push(relation.to);
    }
  }

  // Pointers: descendants of the surface, plus descendants of each edge target.
  const seenPointer = new Set<string>(seenBody);
  const addPointer = (id: string, kind: GraphPointerKind, from?: string) => {
    if (seenPointer.has(id)) return;
    const node = graph.nodes.get(id);
    if (!node) return;
    seenPointer.add(id);
    slice.pointers.push({
      id: node.id,
      ...(node.description !== undefined
        ? { description: node.description }
        : {}),
      kind,
      ...(from !== undefined ? { from } : {}),
    });
  };

  for (const node of graph.nodes.values()) {
    if (isWithinOrBelow(node.folder, surfaceFolder)) {
      addPointer(node.id, "descendant");
    }
  }
  for (const targetId of edgeTargets) {
    const target = graph.nodes.get(targetId);
    if (!target) continue;
    for (const node of graph.nodes.values()) {
      if (isWithinOrBelow(node.folder, target.folder)) {
        addPointer(node.id, "related", targetId);
      }
    }
  }

  return slice;
}

/** The set of folders on the path from the package root down to `folder`. */
function foldersOnPath(folder: string): Set<string> {
  const set = new Set<string>([""]); // root files reach everywhere
  let current = folder;
  while (current !== "") {
    set.add(current);
    const slash = current.lastIndexOf("/");
    current = slash === -1 ? "" : current.slice(0, slash);
  }
  return set;
}

/** True when `folder` is `base` or nested below it (a descendant position). */
function isWithinOrBelow(folder: string, base: string): boolean {
  if (folder === base) return true;
  if (base === "") return folder !== "";
  return folder.startsWith(`${base}/`);
}
