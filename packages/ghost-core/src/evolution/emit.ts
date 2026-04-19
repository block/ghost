import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  EMBEDDING_FRAGMENT_FILENAME,
  EXPRESSION_FILENAME,
  serializeEmbeddingFragment,
  serializeExpression,
} from "../expression/index.js";
import { EXPRESSION_SCHEMA_VERSION } from "../expression/schema.js";
import type { DesignFingerprint } from "../types.js";

/**
 * Write a fingerprint as a publishable artifact (expression.md) to the
 * project root. Other projects can reference this file as their parent.
 */
export async function emitFingerprint(
  fingerprint: DesignFingerprint,
  cwd: string = process.cwd(),
): Promise<string> {
  const target = resolve(cwd, EXPRESSION_FILENAME);
  await writeFile(target, serializeExpression(fingerprint), "utf-8");

  // v4: the 49-dim embedding lives in a sibling `embedding.md` referenced
  // from the expression body. Readers fall back to recompute if it's missing.
  if (fingerprint.embedding && fingerprint.embedding.length > 0) {
    const embeddingPath = resolve(dirname(target), EMBEDDING_FRAGMENT_FILENAME);
    await writeFile(
      embeddingPath,
      serializeEmbeddingFragment(
        fingerprint.embedding,
        fingerprint.id,
        EXPRESSION_SCHEMA_VERSION,
      ),
      "utf-8",
    );
  }

  return target;
}
