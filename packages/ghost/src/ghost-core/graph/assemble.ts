import type { GhostNodeDocument } from "../node/types.js";
import {
  GHOST_GRAPH_ROOT_ID,
  type GhostGraph,
  type GhostGraphNode,
} from "./types.js";

/**
 * One local node located in the package directory tree: its computed path id,
 * the id of its containing directory (absent ⇒ the node *is* the `core` root,
 * i.e. a package-root `index.md`), and the parsed document.
 */
export interface PlacedNode {
  id: string;
  parent?: string;
  doc: GhostNodeDocument;
}

export interface AssembleGraphInput {
  /** Local nodes located in the package's directory tree. */
  placedNodes?: PlacedNode[];
  /**
   * Read-only nodes inherited from extended packages. Their ids are already
   * qualified (`<package-id>:<node>`). Local nodes never override these and
   * these never override local — they are a disjoint id space.
   */
  inheritedNodes?: GhostGraphNode[];
}

/**
 * Fold the package's sources into one in-memory prose-node graph.
 *
 * Local nodes are the package's directory tree: each node's id is its path and
 * its parent is its containing directory. Intermediate directories that hold no
 * `index.md` are still materialized as bare tree positions so children resolve.
 * Inherited nodes from extended packages join as read-only context. The
 * implicit `core` root is never required to be declared.
 */
export function assembleGraph(input: AssembleGraphInput): GhostGraph {
  const nodes = new Map<string, GhostGraphNode>();

  // Inherited (extended-package) nodes first — lowest precedence, read-only.
  for (const node of input.inheritedNodes ?? []) {
    nodes.set(node.id, node);
  }

  for (const placed of input.placedNodes ?? []) {
    const fm = placed.doc.frontmatter;
    // A node whose parent is absent is the package-root index — the core node.
    const id = placed.parent === undefined ? GHOST_GRAPH_ROOT_ID : placed.id;
    nodes.set(id, {
      id,
      ...(fm.description !== undefined ? { description: fm.description } : {}),
      ...(placed.parent !== undefined ? { parent: placed.parent } : {}),
      relates: fm.relates ?? [],
      ...(fm.incarnation !== undefined ? { incarnation: fm.incarnation } : {}),
      body: placed.doc.body,
      origin: "node-file",
    });
  }

  // Build the containment tree from each node's parent (its directory). The
  // root (`core`) has no parent. Intermediate directories with no index node
  // are seeded as bare positions so the chain resolves to the root.
  const parents = new Map<string, string>();
  const children = new Map<string, string[]>();

  const link = (child: string, parent: string) => {
    if (child === parent) return;
    parents.set(child, parent);
    const list = children.get(parent);
    if (list) {
      if (!list.includes(child)) list.push(child);
    } else {
      children.set(parent, [child]);
    }
  };

  for (const node of nodes.values()) {
    if (node.id === GHOST_GRAPH_ROOT_ID) continue;
    if (node.origin === "inherited") continue;
    link(node.id, node.parent ?? GHOST_GRAPH_ROOT_ID);
    // Seed any ancestor directories that have no index node of their own, so a
    // deep node (a/b/c) still has a/b → a → core links even when a, a/b are
    // empty directories.
    let current = node.parent;
    while (current !== undefined && current !== GHOST_GRAPH_ROOT_ID) {
      const grandparent = parentIdOf(current);
      link(current, grandparent ?? GHOST_GRAPH_ROOT_ID);
      current = grandparent;
    }
  }

  return { nodes, parents, children };
}

/** The id of the directory containing `id`, or undefined when `id` is top-level. */
function parentIdOf(id: string): string | undefined {
  const slash = id.lastIndexOf("/");
  return slash === -1 ? undefined : id.slice(0, slash);
}

/** The ancestor chain for a node id, nearest parent first, ending at the root. */
export function ancestorChain(graph: GhostGraph, id: string): string[] {
  const chain: string[] = [];
  let current = graph.parents.get(id);
  const seen = new Set<string>([id]);
  while (current !== undefined && !seen.has(current)) {
    chain.push(current);
    seen.add(current);
    current = graph.parents.get(current);
  }
  if (chain[chain.length - 1] !== GHOST_GRAPH_ROOT_ID) {
    chain.push(GHOST_GRAPH_ROOT_ID);
  }
  return chain;
}
