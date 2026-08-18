import {
  type GhostCatalog,
  parseSourceRef,
  sliceNodeSection,
} from "#ghost-core";

export interface BaselineProse {
  ref: string;
  nodeId: string;
  heading?: string;
  description?: string;
  body: string;
  warning?: string;
}

export function resolveBaseline(
  raw: string,
  catalog: GhostCatalog,
): BaselineProse | null {
  const ref = parseSourceRef(raw);
  if (ref === null) return null;
  const node = catalog.nodes.get(ref.nodeId);
  if (node === undefined) return null;
  if (ref.heading === undefined) {
    return {
      ref: raw,
      nodeId: ref.nodeId,
      ...(node.description !== undefined
        ? { description: node.description }
        : {}),
      body: node.body,
    };
  }
  const section = sliceNodeSection(node.body, ref.heading);
  return {
    ref: raw,
    nodeId: ref.nodeId,
    heading: ref.heading,
    ...(node.description !== undefined
      ? { description: node.description }
      : {}),
    body: section ?? node.body,
    ...(section === null
      ? {
          warning: `heading '${ref.heading}' not found in node '${ref.nodeId}' — embedding the whole body`,
        }
      : {}),
  };
}
