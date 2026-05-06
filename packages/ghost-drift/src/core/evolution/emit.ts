import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Fingerprint } from "@ghost/core";
import { FINGERPRINT_FILENAME, serializeFingerprint } from "ghost-fingerprint";

/**
 * Write a fingerprint as a publishable artifact (fingerprint.md) to the
 * project root. Other projects can track this file as a reference.
 */
export async function emitFingerprint(
  fingerprint: Fingerprint,
  cwd: string = process.cwd(),
): Promise<string> {
  const target = resolve(cwd, FINGERPRINT_FILENAME);
  await writeFile(target, serializeFingerprint(fingerprint), "utf-8");

  return target;
}
