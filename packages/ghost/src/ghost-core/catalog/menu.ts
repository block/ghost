import type { GhostCatalog } from "./types.js";

export interface BuildCatalogMenuOptions {
  /** Include kinds that declare `posture: wild`; default menus omit them. */
  includeWild?: boolean;
}

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
  /** Count of material locators available after pulling this node. */
  materials?: number;
  /** True when this entry carries concrete material by derived structure. */
  concrete: boolean;
  /** True when this entry includes a Skeleton section. */
  hasSkeleton?: true;
  /** Consumption posture for this menu entry. */
  posture: "steady" | "wild" | "guard";
  /** True when this entry pushes past the fingerprint rather than conforming to it. */
  wild?: true;
  /** True when this entry is review-critical guard posture. */
  guard?: true;
}

/**
 * Build the gather menu: every authored node, with its kind and description,
 * sorted by id for stable output. A flat catalog — no anchor, no hierarchy;
 * the agent selects from it.
 */
export function buildCatalogMenu(
  catalog: GhostCatalog,
  options: BuildCatalogMenuOptions = {},
): CatalogMenuEntry[] {
  const entries: CatalogMenuEntry[] = [];

  for (const node of catalog.nodes.values()) {
    if (node.wild && !options.includeWild) continue;
    entries.push({
      id: node.id,
      ...(node.kind !== undefined ? { kind: node.kind } : {}),
      ...(node.description ? { description: node.description } : {}),
      ...(node.materials !== undefined && node.materials.length > 0
        ? { materials: node.materials.length }
        : {}),
      concrete: node.concrete,
      ...(node.hasSkeleton ? { hasSkeleton: true as const } : {}),
      posture: node.posture,
      ...(node.wild ? { wild: true as const } : {}),
      ...(node.guard ? { guard: true as const } : {}),
    });
  }

  return entries.sort((a, b) => a.id.localeCompare(b.id));
}
