import { stringify as stringifyYaml } from "yaml";
import type { GhostNodeDocument, GhostNodeFrontmatter } from "./types.js";

/**
 * Serialize a node back to its `---\n<yaml>\n---\n<body>` markdown form. Keys
 * are emitted in a stable order (id, under, relates, incarnation) so round-trips and
 * diffs are deterministic. Undefined fields are omitted.
 */
export function serializeNode(node: GhostNodeDocument): string {
  const fm = node.frontmatter;
  const ordered: Record<string, unknown> = { id: fm.id };
  if (fm.description !== undefined) ordered.description = fm.description;
  if (fm.under !== undefined) ordered.under = fm.under;
  if (fm.relates !== undefined) {
    ordered.relates = fm.relates.map((relation) => {
      const entry: Record<string, unknown> = { to: relation.to };
      if (relation.as !== undefined) entry.as = relation.as;
      return entry;
    });
  }
  if (fm.incarnation !== undefined) ordered.incarnation = fm.incarnation;

  const yaml = stringifyYaml(ordered).trimEnd();
  const body = node.body.replace(/^\n+/, "");
  return `---\n${yaml}\n---\n${body.length ? `\n${body}\n` : "\n"}`;
}

export type { GhostNodeFrontmatter };
