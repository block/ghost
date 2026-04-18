import { readFile } from "node:fs/promises";
import type { DesignFingerprint } from "../types.js";
import { parseExpression } from "./parser.js";

export type { BodyData } from "./body.js";
export { parseBody } from "./body.js";
export type { ExpressionMeta, FrontmatterData } from "./frontmatter.js";
export type { ParsedExpression } from "./parser.js";
export { parseExpression, splitRaw } from "./parser.js";
export type { SerializeOptions } from "./writer.js";
export { serializeExpression } from "./writer.js";

/** Canonical filename for the emitted expression. */
export const EXPRESSION_FILENAME = "expression.md";
/** Legacy filename retained for back-compat during the transition. */
export const LEGACY_FINGERPRINT_FILENAME = ".ghost-fingerprint.json";

/**
 * Load a fingerprint from disk, dispatching on file extension.
 * - `.md` → parsed as an expression (frontmatter + body)
 * - anything else → parsed as legacy JSON
 *
 * Consolidates the 6 inline JSON.parse(readFile(...)) sites across the CLI.
 */
export async function loadExpression(path: string): Promise<DesignFingerprint> {
  const raw = await readFile(path, "utf-8");
  if (path.endsWith(".md")) {
    return parseExpression(raw).fingerprint;
  }
  return JSON.parse(raw) as DesignFingerprint;
}
