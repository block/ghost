import type { GhostNodeDocument } from "../node/types.js";
import {
  GHOST_GRAPH_ROOT_ID,
  type GhostGraph,
  type GhostGraphNode,
} from "./types.js";

/**
 * One local node located in the package directory tree: its computed path id,
 * its file folder, and the parsed document. Containment is not carried here —
 * the parent is derived from the id (`parentIdOrRoot`). The package-root
 * `index.md` computes to id `core` with folder `""`.
 */
export interface PlacedNode {
  id: string;
  /**
   * The node's file folder — the directory its source file sits in. For an
   * index node this is its own id (`a/b/index.md` → `a/b`); for a leaf it is
   * the directory it sits in (`a/b.md` → `a`); for the root `index.md` it is
   * `""`.
   */
  folder: string;
  doc: GhostNodeDocument;
}

export interface AssembleGraphInput {
  /** Local nodes located in the package's directory tree. */
  placedNodes?: PlacedNode[];
}

/**
 * Fold the package's directory tree into one in-memory prose-node graph.
 *
 * Each node's id is its path (the package-root `index.md` computes to `core`).
 * Containment is not materialized — a node's parent is `parentIdOrRoot(id)` and
 * its ancestor chain is a pure id walk, so intermediate directories with no
 * `index.md` need no bare positions.
 */
export function assembleGraph(input: AssembleGraphInput): GhostGraph {
  const nodes = new Map<string, GhostGraphNode>();

  for (const placed of input.placedNodes ?? []) {
    const fm = placed.doc.frontmatter;
    nodes.set(placed.id, {
      id: placed.id,
      ...(fm.description !== undefined ? { description: fm.description } : {}),
      folder: placed.folder,
      relates: fm.relates ?? [],
      body: placed.doc.body,
    });
  }

  return { nodes };
}

/** The id of the directory containing `id`, or undefined when `id` is top-level. */
export function parentIdOf(id: string): string | undefined {
  const slash = id.lastIndexOf("/");
  return slash === -1 ? undefined : id.slice(0, slash);
}

/**
 * A node's containment parent, derived from its id: the containing directory,
 * or the implicit `core` root for a top-level node. The root itself has no
 * parent and returns `core` (harmless — the root is never asked in practice).
 */
export function parentIdOrRoot(id: string): string {
  return parentIdOf(id) ?? GHOST_GRAPH_ROOT_ID;
}

/**
 * The ancestor chain for a node id, nearest parent first, ending at the root.
 * A pure walk over the id string (`a/b/c` → `a/b` → `a` → `core`); no stored
 * containment map. The `core` root has an empty chain.
 */
export function ancestorChain(_graph: GhostGraph, id: string): string[] {
  if (id === GHOST_GRAPH_ROOT_ID) return [];
  const chain: string[] = [];
  let current = parentIdOf(id);
  while (current !== undefined) {
    chain.push(current);
    current = parentIdOf(current);
  }
  chain.push(GHOST_GRAPH_ROOT_ID);
  return chain;
}
