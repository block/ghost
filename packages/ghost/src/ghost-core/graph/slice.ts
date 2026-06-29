import type { GhostNodeRelationKind } from "../node/types.js";
import { ancestorChain } from "./assemble.js";
import { GHOST_GRAPH_ROOT_ID, type GhostGraph } from "./types.js";

/**
 * Why a full-body node is present in a resolved slice.
 * - `own`: a file in the requested surface's own folder.
 * - `ancestor`: a file in a folder higher on the corridor (root → surface).
 * - `edge`: contributed by a typed `relates` link from a spine node (one hop).
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

/**
 * A spoke: a node offered as a pointer (id + description, no body) for the agent
 * to pull on demand. Spokes are navigable optionality, never authoritative
 * context.
 * - `descendant`: a node within or below the requested surface's own subtree.
 * - `edge-hub`: a node within or below an `edge` target's subtree (a hub the
 *   surface `relates` to unfolds its menu).
 */
export type GraphSpokeKind = "descendant" | "edge-hub";

export interface GraphSlicePointer {
  id: string;
  description?: string;
  kind: GraphSpokeKind;
  /** For an `edge-hub` spoke, the hub id it belongs to. */
  hub?: string;
}

export interface GraphSlice {
  /** The requested node/surface id. */
  surface: string;
  /** Ancestor chain from the surface up to (but excluding) the implicit root. */
  ancestors: string[];
  /** The `--as` incarnation filter applied, if any. */
  incarnation?: string;
  /** Full-body context: the corridor spine plus one-hop `relates` edges. */
  nodes: GraphSliceNode[];
  /** Pointers (id + description) the agent may pull: descendants + edge hubs. */
  spokes: GraphSlicePointer[];
}

export interface ResolveGraphSliceOptions {
  /** Filter to nodes whose incarnation matches, plus essence (untagged) nodes. */
  incarnation?: string;
}

/**
 * Compose a context slice for a surface by traversing the graph — deterministic,
 * no I/O, no LLM. The model is "folders are walls; files fill the corridor":
 *
 * - **spine** (`own`/`ancestor`): every node whose **file folder** is on the
 *   surface's corridor — the chain of folders from the package root down to the
 *   surface's own folder. A sibling folder is a wall: its nodes never appear.
 *   Spine nodes are full bodies.
 * - **edge**: for each spine node's `relates`, the target node's body is
 *   included once (one hop, no recursion), tagged by the relation qualifier.
 *   This is how a broad rule placed high in the corridor (e.g. "all feature UI
 *   draws on Arcade", authored once on `features`) reaches every descendant.
 * - **spokes**: descendants of the surface's own folder, plus descendants of
 *   each edge target (a hub the surface draws on unfolds its menu), as pointers.
 *
 * The `incarnation` option filters full-body nodes: essence (untagged) always
 * passes; a tagged node passes only when it matches. Spokes are unfiltered
 * pointers.
 */
export function resolveGraphSlice(
  graph: GhostGraph,
  surfaceId: string,
  options: ResolveGraphSliceOptions = {},
): GraphSlice {
  const ancestorsFull = ancestorChain(graph, surfaceId);
  const ancestors = ancestorsFull.filter((id) => id !== GHOST_GRAPH_ROOT_ID);

  const surfaceNode = graph.nodes.get(surfaceId);
  // The surface's own file folder anchors the corridor. For a bare tree
  // position (a directory with no index node) the folder is the id itself.
  const surfaceFolder = surfaceNode?.folder ?? surfaceId;
  const corridor = corridorFolders(surfaceFolder);

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
    spokes: [],
  };

  const seenBody = new Set<string>();
  const addBody = (id: string, provenance: GraphSliceProvenance): boolean => {
    if (seenBody.has(id)) return false;
    const node = graph.nodes.get(id);
    if (!node) return false;
    if (!passesIncarnation(node.incarnation)) return false;
    seenBody.add(id);
    slice.nodes.push({
      id: node.id,
      body: node.body,
      ...(node.incarnation !== undefined
        ? { incarnation: node.incarnation }
        : {}),
      provenance,
    });
    return true;
  };

  // Spine: every node whose file folder is on the corridor. `own` when the
  // node sits in the surface's own folder; `ancestor` when higher up.
  for (const node of graph.nodes.values()) {
    if (node.origin === "inherited") continue;
    if (!corridor.has(node.folder)) continue;
    const provenance: GraphSliceProvenance =
      node.folder === surfaceFolder
        ? { kind: "own" }
        : { kind: "ancestor", from: node.parent ?? GHOST_GRAPH_ROOT_ID };
    addBody(node.id, provenance);
  }

  // Edges: one hop along `relates` from every spine node. The target's body is
  // included; if the target is a hub, its subtree is offered as spokes.
  const spineIds = slice.nodes.map((n) => n.id);
  const edgeTargets: string[] = [];
  for (const sourceId of spineIds) {
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

  // Spokes: descendants of the surface, plus descendants of each edge hub.
  const seenSpoke = new Set<string>(seenBody);
  const addSpoke = (id: string, kind: GraphSpokeKind, hub?: string) => {
    if (seenSpoke.has(id)) return;
    const node = graph.nodes.get(id);
    if (!node) return;
    seenSpoke.add(id);
    slice.spokes.push({
      id: node.id,
      ...(node.description !== undefined
        ? { description: node.description }
        : {}),
      kind,
      ...(hub !== undefined ? { hub } : {}),
    });
  };

  for (const node of graph.nodes.values()) {
    if (node.origin === "inherited") continue;
    if (isWithinOrBelow(node.folder, surfaceFolder)) {
      addSpoke(node.id, "descendant");
    }
  }
  for (const hubId of edgeTargets) {
    const hub = graph.nodes.get(hubId);
    if (!hub) continue;
    for (const node of graph.nodes.values()) {
      if (isWithinOrBelow(node.folder, hub.folder)) {
        addSpoke(node.id, "edge-hub", hubId);
      }
    }
  }

  return slice;
}

/** The set of folders on the corridor from the package root down to `folder`. */
function corridorFolders(folder: string): Set<string> {
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
