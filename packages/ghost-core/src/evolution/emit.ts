import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  EXPRESSION_FILENAME,
  LEGACY_FINGERPRINT_FILENAME,
  serializeExpression,
} from "../expression/index.js";
import type { DesignFingerprint } from "../types.js";

export interface EmitOptions {
  /**
   * File format to write.
   * - "md" (default): writes `expression.md` — the canonical artifact.
   * - "json": writes legacy `.ghost-fingerprint.json` with a deprecation
   *   notice. Retained for external consumers mid-migration.
   */
  format?: "md" | "json";
}

/**
 * Write a fingerprint as a publishable artifact to the project root.
 * Other projects can reference this file as their parent.
 */
export async function emitFingerprint(
  fingerprint: DesignFingerprint,
  cwd: string = process.cwd(),
  options: EmitOptions = {},
): Promise<string> {
  const format = options.format ?? "md";

  if (format === "json") {
    console.warn(
      `[ghost] --emit json is deprecated. ${LEGACY_FINGERPRINT_FILENAME} will be removed in a future release; migrate to ${EXPRESSION_FILENAME}.`,
    );
    const target = resolve(cwd, LEGACY_FINGERPRINT_FILENAME);
    await writeFile(target, JSON.stringify(fingerprint, null, 2), "utf-8");
    return target;
  }

  const target = resolve(cwd, EXPRESSION_FILENAME);
  await writeFile(target, serializeExpression(fingerprint), "utf-8");
  return target;
}
