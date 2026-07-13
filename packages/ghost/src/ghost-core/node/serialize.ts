import { stringify as stringifyYaml } from "yaml";
import type { GhostNodeDocument, GhostNodeFrontmatter } from "./types.js";

const FRONTMATTER_KEY_ORDER = ["description", "materials"] as const;

function shouldSerializeFrontmatterValue(value: unknown): boolean {
  return value !== undefined;
}

/**
 * Serialize a node back to its `---\n<yaml>\n---\n<body>` markdown form. Known
 * keys are emitted first in a stable order (description, materials), followed
 * by any free-form descriptive keys in alphabetical order so round-trips and
 * diffs are deterministic. Identity and kind are not serialized — they come
 * from the node's file path and optional filename prefix. Undefined fields are
 * omitted; a node with no frontmatter fields emits an empty block.
 */
export function serializeNode(node: GhostNodeDocument): string {
  const fm = node.frontmatter as Record<string, unknown>;
  const ordered: Record<string, unknown> = {};
  const emitted = new Set<string>();

  for (const key of FRONTMATTER_KEY_ORDER) {
    const value = fm[key];
    if (shouldSerializeFrontmatterValue(value)) {
      ordered[key] = value;
      emitted.add(key);
    }
  }

  for (const key of Object.keys(fm).sort()) {
    if (emitted.has(key)) continue;
    const value = fm[key];
    if (shouldSerializeFrontmatterValue(value)) ordered[key] = value;
  }

  // An empty frontmatter object stringifies to "{}"; emit a bare block instead.
  const yaml =
    Object.keys(ordered).length === 0
      ? ""
      : `${stringifyYaml(ordered).trimEnd()}\n`;
  const body = node.body.replace(/^\n+/, "");
  return `---\n${yaml}---\n${body.length ? `\n${body}\n` : "\n"}`;
}

export type { GhostNodeFrontmatter };
