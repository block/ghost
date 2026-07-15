/**
 * A node in the fingerprint catalog — pure prose plus its filename-derived
 * identity. The body is the design expression; there are no structured content
 * fields. Kind comes from the filename prefix; there is no traversal or
 * containment model — the catalog is a flat map the agent selects from.
 */
export interface GhostCatalogNode {
  id: string;
  /** Optional filename prefix before the first dot (`principle.density`). */
  kind?: string;
  /** Filename slug: bare name, or the part after the first dot. */
  slug: string;
  /** Retrieval payload shown in gather: what applies, when, and what it contributes. */
  description?: string;
  /** Optional material locators carried by the authored node. */
  materials?: string[];
  /** True when the node carries a material locator, substantial fence, or Skeleton. */
  concrete: boolean;
  /** True when the node body carries a fenced block of at least 3 lines. */
  hasFencedExample: boolean;
  /** True when the node declares a `## Skeleton` section. */
  hasSkeleton: boolean;
  body: string;
}

/**
 * The in-memory fingerprint catalog: prose nodes indexed by id. A flat map —
 * no edges, no cascade, no traversal. Identity comes from each file's path.
 */
export interface GhostCatalog {
  /** Every node, indexed by id. */
  nodes: Map<string, GhostCatalogNode>;
}
