import { stringify as stringifyYaml } from "yaml";
import type { GhostNodeDocument, GhostNodeFrontmatter } from "./types.js";

/**
 * Serialize a node back to its `---\n<yaml>\n---\n<body>` markdown form. Keys
 * are emitted in a stable order (description) so round-trips and diffs are
 * deterministic. Identity, kind, and containment are not serialized — they are
 * the node's path in the directory tree. Undefined fields are omitted; a node
 * with no frontmatter fields emits an empty block.
 */
export function serializeNode(node: GhostNodeDocument): string {
  const fm = node.frontmatter;
  const ordered: Record<string, unknown> = {};
  if (fm.description !== undefined) ordered.description = fm.description;

  // An empty frontmatter object stringifies to "{}"; emit a bare block instead.
  const yaml =
    Object.keys(ordered).length === 0
      ? ""
      : `${stringifyYaml(ordered).trimEnd()}\n`;
  const body = node.body.replace(/^\n+/, "");
  return `---\n${yaml}---\n${body.length ? `\n${body}\n` : "\n"}`;
}

export type { GhostNodeFrontmatter };
