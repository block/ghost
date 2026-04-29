import { createHash } from "node:crypto";
import type { BucketSource } from "./types.js";

/**
 * Deterministic ID generation for bucket rows.
 *
 * Two scans of the same `(target, commit)` over the same source content
 * must produce identical IDs so that re-merging is idempotent and git
 * diffs over `bucket.json` show only meaningful changes. Scans of
 * different commits or different targets produce distinct IDs so that
 * fleet-wide merges preserve every observation.
 *
 * IDs are 16-hex-char (8-byte) prefixes of SHA-256. At ~10^6 rows in the
 * universe of all scans this gives collision probability under 2^-32.
 */

const ID_LENGTH = 16;

const VALUE_TAG = "value";
const TOKEN_TAG = "token";
const COMPONENT_TAG = "component";
const LIBRARY_TAG = "library";

function digest(...parts: (string | undefined)[]): string {
  const hash = createHash("sha256");
  for (const part of parts) {
    hash.update(part ?? "");
    hash.update("\x00");
  }
  return hash.digest("hex").slice(0, ID_LENGTH);
}

function sourceKey(source: BucketSource): [string, string] {
  return [source.target, source.commit ?? ""];
}

export function valueRowId(
  source: BucketSource,
  kind: string,
  value: string,
  raw: string,
): string {
  const [target, commit] = sourceKey(source);
  return digest(target, commit, VALUE_TAG, kind, value, raw);
}

export function tokenRowId(source: BucketSource, name: string): string {
  const [target, commit] = sourceKey(source);
  return digest(target, commit, TOKEN_TAG, name);
}

export function componentRowId(source: BucketSource, name: string): string {
  const [target, commit] = sourceKey(source);
  return digest(target, commit, COMPONENT_TAG, name);
}

export function libraryRowId(source: BucketSource, name: string): string {
  const [target, commit] = sourceKey(source);
  return digest(target, commit, LIBRARY_TAG, name);
}
