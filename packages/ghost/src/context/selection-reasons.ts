import type {
  FingerprintGraph,
  FingerprintGraphNode,
  NodeRef,
} from "./graph.js";
import { pathsOverlap, unique } from "./graph.js";

export interface SelectionReason {
  kind: "path" | "scope" | "surface_type" | "linked_ref" | "global_fallback";
  value: string;
}

export function directSelectionReasons(
  node: FingerprintGraphNode,
  options: {
    requestedPaths: string[];
    matchedScopeIds: string[];
    matchedSurfaceTypes: string[];
  },
): SelectionReason[] {
  const reasons: SelectionReason[] = [];
  for (const path of matchingPaths(
    node.appliesTo.paths,
    options.requestedPaths,
  )) {
    reasons.push({ kind: "path", value: path });
  }
  for (const scope of matchingValues(
    node.appliesTo.scopes,
    options.matchedScopeIds,
  )) {
    reasons.push({ kind: "scope", value: scope });
  }
  for (const surfaceType of matchingValues(
    node.appliesTo.surfaceTypes,
    options.matchedSurfaceTypes,
  )) {
    reasons.push({ kind: "surface_type", value: surfaceType });
  }
  return reasons;
}

export function expandOneHopWithReasons(
  refs: Set<NodeRef>,
  graph: FingerprintGraph,
  selectionReasons: Map<NodeRef, SelectionReason[]>,
): Set<NodeRef> {
  const expanded = new Set(refs);
  for (const edge of graph.edges) {
    if (refs.has(edge.from)) {
      expanded.add(edge.to);
      if (!refs.has(edge.to)) {
        addSelectionReason(selectionReasons, edge.to, {
          kind: "linked_ref",
          value: edge.from,
        });
      }
    }
    if (refs.has(edge.to)) {
      expanded.add(edge.from);
      if (!refs.has(edge.from)) {
        addSelectionReason(selectionReasons, edge.from, {
          kind: "linked_ref",
          value: edge.to,
        });
      }
    }
  }
  return expanded;
}

export function globalFallbackRefs(
  graph: FingerprintGraph,
  requestedPaths: string[],
  selectionReasons: Map<NodeRef, SelectionReason[]>,
): Set<NodeRef> {
  const refs = new Set<NodeRef>();
  const value = requestedPaths.join(", ") || ".";
  for (const node of graph.nodes) {
    refs.add(node.ref);
    addSelectionReason(selectionReasons, node.ref, {
      kind: "global_fallback",
      value,
    });
  }
  return refs;
}

export function addSelectionReason(
  reasons: Map<NodeRef, SelectionReason[]>,
  ref: NodeRef,
  reason: SelectionReason,
): void {
  const current = reasons.get(ref) ?? [];
  if (
    !current.some(
      (entry) => entry.kind === reason.kind && entry.value === reason.value,
    )
  ) {
    current.push(reason);
  }
  reasons.set(ref, current);
}

function matchingPaths(paths: string[], requestedPaths: string[]): string[] {
  const out: string[] = [];
  for (const targetPath of requestedPaths) {
    if (paths.some((path) => pathsOverlap(path, targetPath))) {
      out.push(targetPath);
    }
  }
  return unique(out);
}

function matchingValues(values: string[], candidates: string[]): string[] {
  const candidateSet = new Set(candidates);
  return values.filter((value) => candidateSet.has(value));
}
