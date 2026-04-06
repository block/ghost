import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { DesignFingerprint } from "../types.js";

const FINGERPRINT_FILENAME = ".ghost-fingerprint.json";

/**
 * Write a fingerprint as a publishable artifact to the project root.
 * Other projects can reference this file as their parent.
 */
export async function emitFingerprint(
  fingerprint: DesignFingerprint,
  cwd: string = process.cwd(),
): Promise<string> {
  const target = resolve(cwd, FINGERPRINT_FILENAME);
  await writeFile(target, JSON.stringify(fingerprint, null, 2), "utf-8");
  return target;
}
