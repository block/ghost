import type {
  Bucket,
  BucketSource,
  ComponentRow,
  RowBase,
  TokenRow,
  ValueRow,
} from "./types.js";

/**
 * Merge N buckets into one. Concat semantics with id-based dedup.
 *
 * Two scans of the same `(target, commit)` produce rows with identical
 * IDs by construction — those rows are deduplicated to one (first wins).
 * Two scans of different commits or different targets produce distinct
 * IDs, so all observations survive.
 *
 * `sources` becomes the union of input sources, also deduped on
 * `(target, commit)`.
 *
 * Idempotent: `mergeBuckets(b)` == `b`. Commutative on the rowset (order
 * within sections may differ from input order but content is identical).
 */
export function mergeBuckets(...buckets: Bucket[]): Bucket {
  if (buckets.length === 0) {
    throw new Error("mergeBuckets requires at least one input bucket");
  }
  return {
    schema: "ghost.bucket/v1",
    sources: dedupSources(buckets.flatMap((b) => b.sources)),
    values: dedupRows(buckets.flatMap((b) => b.values)),
    tokens: dedupRows(buckets.flatMap((b) => b.tokens)),
    components: dedupRows(buckets.flatMap((b) => b.components)),
  };
}

function dedupRows<T extends RowBase>(rows: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of rows) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row);
  }
  return out;
}

function dedupSources(sources: BucketSource[]): BucketSource[] {
  const seen = new Set<string>();
  const out: BucketSource[] = [];
  for (const source of sources) {
    const key = `${source.target}\x00${source.commit ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(source);
  }
  return out;
}

// Type re-exports kept narrow so consumers don't have to import from `types.js`
// just to use `mergeBuckets` results.
export type { Bucket, BucketSource, ComponentRow, TokenRow, ValueRow };
