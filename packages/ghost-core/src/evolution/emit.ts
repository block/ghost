import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  EMBEDDING_FRAGMENT_FILENAME,
  FINGERPRINT_FILENAME,
  serializeEmbeddingFragment,
  serializeFingerprint,
} from "../fingerprint/index.js";
import type { Fingerprint } from "../types.js";

/**
 * Write a fingerprint as a publishable artifact (fingerprint.md) to the
 * project root. Other projects can reference this file as their parent.
 */
export async function emitFingerprint(
  fingerprint: Fingerprint,
  cwd: string = process.cwd(),
): Promise<string> {
  const target = resolve(cwd, FINGERPRINT_FILENAME);
  await writeFile(target, serializeFingerprint(fingerprint), "utf-8");

  // The 49-dim embedding lives in a sibling `embedding.md` referenced from
  // the fingerprint body. Readers fall back to recompute if it's missing.
  if (fingerprint.embedding && fingerprint.embedding.length > 0) {
    const embeddingPath = resolve(dirname(target), EMBEDDING_FRAGMENT_FILENAME);
    await writeFile(
      embeddingPath,
      serializeEmbeddingFragment(fingerprint.embedding, fingerprint.id),
      "utf-8",
    );
  }

  return target;
}
