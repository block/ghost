import {
  type GhostCatalog,
  parseGuidanceRef,
  sliceNodeSection,
} from "#ghost-core";

export interface GuidanceExcerpt {
  ref: string;
  nodeId: string;
  heading?: string;
  for?: string;
  body: string;
}

export function resolveGuidanceExcerpt(
  raw: string,
  catalog: GhostCatalog,
): GuidanceExcerpt | null {
  const ref = parseGuidanceRef(raw);
  if (ref === null) return null;
  const node = catalog.nodes.get(ref.nodeId);
  if (node === undefined) return null;
  if (ref.heading === undefined) {
    return {
      ref: raw,
      nodeId: ref.nodeId,
      ...(node.for !== undefined ? { for: node.for } : {}),
      body: node.body,
    };
  }
  const section = sliceNodeSection(node.body, ref.heading);
  if (section === null) return null;
  return {
    ref: raw,
    nodeId: ref.nodeId,
    heading: ref.heading,
    ...(node.for !== undefined ? { for: node.for } : {}),
    body: section,
  };
}
