import { parentIdOf, parentIdOrRoot } from "./assemble.js";
import { GHOST_GRAPH_ROOT_ID, type GhostGraph } from "./types.js";

/**
 * One entry in the gather catalog: a node an agent can anchor a task at,
 * presented as `id` + `description` — the retrieval payload (the same shape a
 * tool catalog uses for selection). The agent matches a natural-language ask
 * against these and picks; Ghost does no NLP.
 */
export interface GraphMenuEntry {
  id: string;
  description?: string;
  /** The containment parent, for orientation (the implicit root for top nodes). */
  parent: string;
}

/**
 * Build the gather catalog: every node, with its description, plus the implicit
 * `core` root. Sorted by id for stable output. Callers may further narrow (e.g.
 * only described nodes) for large graphs; this returns the full catalog.
 */
export function buildGraphMenu(graph: GhostGraph): GraphMenuEntry[] {
  const entries: GraphMenuEntry[] = [
    {
      id: GHOST_GRAPH_ROOT_ID,
      description: "The product-wide root; true everywhere.",
      parent: GHOST_GRAPH_ROOT_ID,
    },
  ];

  const seen = new Set<string>([GHOST_GRAPH_ROOT_ID]);

  for (const node of graph.nodes.values()) {
    if (node.id === GHOST_GRAPH_ROOT_ID) continue;
    seen.add(node.id);
    entries.push({
      id: node.id,
      ...(node.description ? { description: node.description } : {}),
      parent: parentIdOrRoot(node.id),
    });
  }

  // Intermediate directories with no index node of their own are still
  // anchorable tree positions. Derive them from every local node's id chain
  // (e.g. `a/b/c` implies bare positions `a/b` and `a`) and include any not
  // already present as a node.
  for (const node of graph.nodes.values()) {
    let ancestor = parentIdOf(node.id);
    while (ancestor !== undefined) {
      if (!seen.has(ancestor)) {
        seen.add(ancestor);
        entries.push({ id: ancestor, parent: parentIdOrRoot(ancestor) });
      }
      ancestor = parentIdOf(ancestor);
    }
  }

  return entries.sort((a, b) => a.id.localeCompare(b.id));
}
