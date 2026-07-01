import type { GhostCatalog } from "./types.js";

/**
 * One entry in the gather menu: a node presented as `id` + `kind` +
 * `description` — the retrieval payload the agent selects against. The agent
 * matches a natural-language ask against these and reads what it judges
 * relevant; Ghost does no NLP and no selection.
 */
export interface CatalogMenuEntry {
  id: string;
  /** The node's kind (filename prefix), when it declares one. */
  kind?: string;
  description?: string;
}

/**
 * Build the gather menu: every authored node, with its kind and description,
 * sorted by id for stable output. A flat catalog — no anchor, no tree
 * positions; the agent selects from it.
 */
export function buildCatalogMenu(graph: GhostCatalog): CatalogMenuEntry[] {
  const entries: CatalogMenuEntry[] = [];

  for (const node of graph.nodes.values()) {
    entries.push({
      id: node.id,
      ...(node.kind !== undefined ? { kind: node.kind } : {}),
      ...(node.description ? { description: node.description } : {}),
    });
  }

  return entries.sort((a, b) => a.id.localeCompare(b.id));
}
