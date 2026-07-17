import type { GhostCatalog } from "./types.js";

/**
 * One entry in the gather menu: a node presented as `id` + `kind` +
 * `description`, the retrieval payload the agent selects against. The agent
 * matches a natural-language ask against these and pulls applicable nodes;
 * ghost does no NLP and no selection.
 */
export interface CatalogMenuEntry {
  id: string;
  /** The node's kind (filename prefix), when it declares one. */
  kind?: string;
  description?: string;
  /** Count of material locators available after pulling this node. */
  materials?: number;
  /** True when this entry carries a material locator, fenced example, or Skeleton. */
  concrete: boolean;
  /** True when this entry includes a substantial fenced example. */
  hasFencedExample?: true;
  /** True when this entry includes a Skeleton section. */
  hasSkeleton?: true;
}

/**
 * Build the gather menu: every authored node, with its kind and description,
 * sorted by id for stable output. A flat catalog — no anchor, no hierarchy;
 * the agent selects from it.
 */
export function buildCatalogMenu(catalog: GhostCatalog): CatalogMenuEntry[] {
  const entries: CatalogMenuEntry[] = [];

  for (const node of catalog.nodes.values()) {
    entries.push({
      id: node.id,
      ...(node.kind !== undefined ? { kind: node.kind } : {}),
      ...(node.description ? { description: node.description } : {}),
      ...(node.materials !== undefined && node.materials.length > 0
        ? { materials: node.materials.length }
        : {}),
      concrete: node.concrete,
      ...(node.hasFencedExample ? { hasFencedExample: true as const } : {}),
      ...(node.hasSkeleton ? { hasSkeleton: true as const } : {}),
    });
  }

  return entries.sort((a, b) => a.id.localeCompare(b.id));
}
