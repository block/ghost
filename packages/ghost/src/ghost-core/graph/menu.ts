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
 * Build the gather catalog: every local node, with its description, plus the
 * implicit `core` root. Sorted by id for stable output. Inherited
 * (extended-package) nodes are excluded — the menu lists what this package
 * offers to anchor at. Callers may further narrow (e.g. only described nodes)
 * for large graphs; this returns the full local catalog.
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
    if (node.origin === "inherited") continue;
    seen.add(node.id);
    entries.push({
      id: node.id,
      ...(node.description ? { description: node.description } : {}),
      parent: node.under ?? GHOST_GRAPH_ROOT_ID,
    });
  }

  // Tree positions declared only in the spine file (surfaces.yml) — no node of
  // their own yet — are still anchorable. Include them as bare entries.
  for (const [id, parent] of graph.parents) {
    if (seen.has(id)) continue;
    seen.add(id);
    entries.push({ id, parent });
  }

  return entries.sort((a, b) => a.id.localeCompare(b.id));
}
