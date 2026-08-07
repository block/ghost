import {
  type GhostCatalog,
  parseSourceRef,
  sliceNodeSection,
} from "#ghost-core";

export interface BaselineProse {
  ref: string;
  nodeId: string;
  heading?: string;
  context?: string;
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
      ...(node.context !== undefined ? { context: node.context } : {}),
      body: node.body,
    };
  }
  const section = sliceNodeSection(node.body, ref.heading);
  return {
    ref: raw,
    nodeId: ref.nodeId,
    heading: ref.heading,
    ...(node.context !== undefined ? { context: node.context } : {}),
    body: section ?? node.body,
    ...(section === null
      ? {
          warning: `heading '${ref.heading}' not found in node '${ref.nodeId}' — embedding the whole body`,
        }
      : {}),
  };
}
