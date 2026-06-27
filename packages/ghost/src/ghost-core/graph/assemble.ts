import type { GhostFingerprintDocument } from "../fingerprint/types.js";
import type { GhostNodeDocument } from "../node/types.js";
import type { GhostSurfacesDocument } from "../surfaces/types.js";
import { projectFacetsToNodes } from "./project-facets.js";
import {
  GHOST_GRAPH_ROOT_ID,
  type GhostGraph,
  type GhostGraphNode,
} from "./types.js";

export interface AssembleGraphInput {
  /** Authored on-disk node files (parsed `ghost.node/v1` documents). */
  nodeFiles?: GhostNodeDocument[];
  /** The legacy facet doc, projected into prose nodes (transition scaffold). */
  fingerprint?: GhostFingerprintDocument;
  /** The explicit surface tree, which seeds tree nodes even when empty. */
  surfaces?: GhostSurfacesDocument;
}

/**
 * Fold the package's sources into one in-memory prose-node graph.
 *
 * Sources are unioned: authored node files take precedence over same-id facet
 * projections (authored beats projected). The surface tree (`surfaces.yml`)
 * seeds containment so a surface with no node still exists as a tree position.
 * The implicit `core` root is never required to be declared.
 */
export function assembleGraph(input: AssembleGraphInput): GhostGraph {
  const nodes = new Map<string, GhostGraphNode>();

  // Facet projections first (lowest precedence), then authored node files
  // overwrite by id (authored beats projected).
  if (input.fingerprint) {
    for (const projected of projectFacetsToNodes(input.fingerprint)) {
      nodes.set(projected.id, projected);
    }
  }
  for (const doc of input.nodeFiles ?? []) {
    const fm = doc.frontmatter;
    nodes.set(fm.id, {
      id: fm.id,
      ...(fm.under !== undefined ? { under: fm.under } : {}),
      relates: fm.relates ?? [],
      ...(fm.medium !== undefined ? { medium: fm.medium } : {}),
      body: doc.body,
      origin: "node-file",
    });
  }

  // Build the containment tree. Surfaces seed positions; node `under` edges and
  // surface `parent` edges both contribute. The root (`core`) has no parent.
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

  // Surface tree edges (the authoritative spine in Phase 2).
  for (const surface of input.surfaces?.surfaces ?? []) {
    if (surface.id === GHOST_GRAPH_ROOT_ID) continue;
    link(surface.id, surface.parent ?? GHOST_GRAPH_ROOT_ID);
  }

  // Node containment: a node `under` X is a child of X. A placed node whose
  // `under` is itself a node id nests under that node; otherwise it attaches to
  // the named surface (or core).
  for (const node of nodes.values()) {
    if (node.id === GHOST_GRAPH_ROOT_ID) continue;
    if (node.under !== undefined) {
      link(node.id, node.under);
    }
  }

  return { nodes, parents, children };
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
