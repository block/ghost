import { GHOST_GRAPH_ROOT_ID, type GhostGraph } from "#ghost-core";

export type ScanContributionState =
  | "missing"
  | "invalid"
  | "empty"
  | "contributing";

export interface ScanSurfaceCoverage {
  /** Surface id (tree position). */
  id: string;
  /** Number of nodes placed directly on this surface. */
  node_count: number;
}

export interface ScanContributionReport {
  state: ScanContributionState;
  /** Total authored nodes in the graph. */
  node_count: number;
  /** Nodes with no incarnation tag (essence). */
  essence_count: number;
  /** Nodes carrying an incarnation tag. */
  incarnation_count: number;
  /** Declared surfaces and how many nodes each holds. */
  surfaces: ScanSurfaceCoverage[];
  /** Declared surfaces with zero nodes placed on them. */
  sparse_surfaces: string[];
  reasons: string[];
}

/**
 * Summarize what a package contributes, as node/surface contribution over the
 * graph (the only model). A package is "contributing" when it has at least one
 * node beyond the implicit root.
 */
export function summarizeFingerprintContribution(input: {
  graph?: GhostGraph;
  /** Declared surface ids from surfaces.yml (excluding the implicit root). */
  surfaceIds?: string[];
  missing?: boolean;
  invalidReason?: string;
}): ScanContributionReport {
  if (input.missing) {
    return emptyReport("missing", [
      "No manifest.yml found; this is not a Ghost package.",
    ]);
  }
  if (input.invalidReason || !input.graph) {
    return emptyReport("invalid", [
      `Package did not load: ${input.invalidReason ?? "unknown error"}.`,
    ]);
  }

  const graph = input.graph;
  const nodes = [...graph.nodes.values()].filter(
    (node) => node.id !== GHOST_GRAPH_ROOT_ID,
  );
  const essence = nodes.filter((node) => node.incarnation === undefined);
  const tagged = nodes.filter((node) => node.incarnation !== undefined);

  // Surface coverage: count nodes whose `under` is each declared surface.
  const placement = new Map<string, number>();
  for (const node of nodes) {
    const under = node.under ?? GHOST_GRAPH_ROOT_ID;
    placement.set(under, (placement.get(under) ?? 0) + 1);
  }
  const surfaceIds = (input.surfaceIds ?? []).filter(
    (id) => id !== GHOST_GRAPH_ROOT_ID,
  );
  const surfaces: ScanSurfaceCoverage[] = surfaceIds
    .map((id) => ({ id, node_count: placement.get(id) ?? 0 }))
    .sort((a, b) => a.id.localeCompare(b.id));
  const sparse = surfaces.filter((s) => s.node_count === 0).map((s) => s.id);

  const state: ScanContributionState =
    nodes.length > 0 ? "contributing" : "empty";

  return {
    state,
    node_count: nodes.length,
    essence_count: essence.length,
    incarnation_count: tagged.length,
    surfaces,
    sparse_surfaces: sparse,
    reasons:
      state === "contributing"
        ? sparse.length > 0
          ? [`Add nodes for sparse surfaces: ${sparse.join(", ")}.`]
          : ["Package contributes nodes across its declared surfaces."]
        : [
            "Package is valid but has no nodes yet. Add nodes/*.md to contribute.",
          ],
  };
}

function emptyReport(
  state: ScanContributionState,
  reasons: string[],
): ScanContributionReport {
  return {
    state,
    node_count: 0,
    essence_count: 0,
    incarnation_count: 0,
    surfaces: [],
    sparse_surfaces: [],
    reasons,
  };
}
