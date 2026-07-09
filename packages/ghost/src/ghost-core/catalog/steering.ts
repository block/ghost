import type { GhostCatalogNode } from "./types.js";

export function orderPulledNodes(
  nodes: GhostCatalogNode[],
): GhostCatalogNode[] {
  return nodes
    .map((node, index) => ({ node, index, bucket: steeringBucket(node) }))
    .sort((a, b) => a.bucket - b.bucket || a.index - b.index)
    .map((entry) => entry.node);
}

export function steeringBucket(node: GhostCatalogNode): number {
  if (node.id === "index" || node.slug === "index") return 0;
  if (node.guard) return 3;
  if (node.wild) return 2;
  if (node.concrete) return 1;
  return 2;
}
