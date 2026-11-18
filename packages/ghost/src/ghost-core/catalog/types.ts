import type { GhostMaterial } from "../materials.js";

/**
 * A node in the ghost catalog — pure prose plus its filename-derived
 * identity. The body is the design expression; there are no structured content
 * fields beyond retrieval metadata. Kind comes from the filename prefix
 * for display. Only declared prerequisites create links between nodes.
 */
export interface GhostCatalogNode {
  id: string;
  /** Optional filename prefix before the first dot (`principle.density`). */
  kind?: string;
  /** Filename slug: bare name, or the part after the first dot. */
  slug: string;
  /** Node IDs that must be delivered before this node. */
  requires?: readonly string[];
  /** Retrieval payload shown in gather: the situation or activity this guidance is for. */
  for?: string;
  /** Optional bare or annotated material locators carried by the authored node. */
  materials?: GhostMaterial[];
  /** True when the node carries a material locator, substantial fence, or Skeleton. */
  concrete: boolean;
  /** True when the node body carries a fenced block of at least 3 lines. */
  hasFencedExample: boolean;
  /** True when the node declares a `## Skeleton` section. */
  hasSkeleton: boolean;
  body: string;
}

/**
 * The in-memory ghost catalog: prose nodes indexed by id. A flat map —
 * identity comes from each file's path.
 */
export interface GhostCatalog {
  /** Every node, indexed by id. */
  nodes: Map<string, GhostCatalogNode>;
}
