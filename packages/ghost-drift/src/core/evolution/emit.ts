import { mkdir, writeFile } from "node:fs/promises";
import type { Fingerprint } from "@ghost/core";
import { resolveFingerprintPackage, serializeFingerprint } from "ghost-scan";

/**
 * Write a fingerprint as the publishable design-language prior inside the
 * fingerprint package. Other projects can track this file as a reference.
 */
export async function emitFingerprint(
  fingerprint: Fingerprint,
  cwd: string = process.cwd(),
): Promise<string> {
  const paths = resolveFingerprintPackage(undefined, cwd);
  await mkdir(paths.dir, { recursive: true });
  const target = paths.fingerprint;
  await writeFile(target, serializeFingerprint(fingerprint), "utf-8");

  return target;
}
