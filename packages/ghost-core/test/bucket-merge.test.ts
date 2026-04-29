import { describe, expect, it } from "vitest";
import { tokenRowId, valueRowId } from "../src/bucket/id.js";
import { mergeBuckets } from "../src/bucket/merge.js";
import type {
  Bucket,
  BucketSource,
  TokenRow,
  ValueRow,
} from "../src/bucket/types.js";

const SOURCE_A: BucketSource = {
  target: "github:block/ghost",
  commit: "abc123",
  scanned_at: "2026-04-29T12:00:00Z",
};

const SOURCE_B: BucketSource = {
  target: "github:block/other",
  commit: "def456",
  scanned_at: "2026-04-29T12:00:00Z",
};

function valueRow(
  source: BucketSource,
  kind: string,
  value: string,
  raw: string,
  occurrences = 1,
): ValueRow {
  return {
    id: valueRowId(source, kind, value, raw),
    source,
    kind,
    value,
    raw,
    occurrences,
    files_count: 1,
  };
}

function tokenRow(
  source: BucketSource,
  name: string,
  resolved: string,
): TokenRow {
  return {
    id: tokenRowId(source, name),
    source,
    name,
    alias_chain: [],
    resolved_value: resolved,
    occurrences: 1,
  };
}

function makeBucket(
  source: BucketSource,
  values: ValueRow[] = [],
  tokens: TokenRow[] = [],
): Bucket {
  return {
    schema: "ghost.bucket/v1",
    sources: [source],
    values,
    tokens,
    components: [],
    libraries: [],
  };
}

describe("mergeBuckets", () => {
  it("merging a single bucket returns equivalent rowset", () => {
    const a = makeBucket(SOURCE_A, [
      valueRow(SOURCE_A, "color", "#f97316", "#f97316"),
    ]);
    const merged = mergeBuckets(a);
    expect(merged.values).toEqual(a.values);
    expect(merged.sources).toEqual([SOURCE_A]);
  });

  it("is idempotent — merging the same bucket twice yields the same rowset", () => {
    const a = makeBucket(SOURCE_A, [
      valueRow(SOURCE_A, "color", "#f97316", "#f97316"),
      valueRow(SOURCE_A, "spacing", "8", "8px"),
    ]);
    const once = mergeBuckets(a);
    const twice = mergeBuckets(a, a);
    expect(twice.values).toEqual(once.values);
    expect(twice.sources).toEqual(once.sources);
  });

  it("preserves rows with distinct IDs across different sources", () => {
    const a = makeBucket(SOURCE_A, [
      valueRow(SOURCE_A, "color", "#f97316", "#f97316"),
    ]);
    const b = makeBucket(SOURCE_B, [
      valueRow(SOURCE_B, "color", "#f97316", "#f97316"),
    ]);
    const merged = mergeBuckets(a, b);
    expect(merged.values).toHaveLength(2);
    expect(merged.sources).toEqual([SOURCE_A, SOURCE_B]);
  });

  it("dedupes rows with identical IDs (same source + same content)", () => {
    const row = valueRow(SOURCE_A, "color", "#f97316", "#f97316");
    const a = makeBucket(SOURCE_A, [row]);
    const b = makeBucket(SOURCE_A, [row]); // same source, same content -> same ID
    const merged = mergeBuckets(a, b);
    expect(merged.values).toHaveLength(1);
    expect(merged.sources).toHaveLength(1);
  });

  it("preserves tokens, components, libraries independently", () => {
    const a = makeBucket(
      SOURCE_A,
      [],
      [tokenRow(SOURCE_A, "--brand-primary", "#f97316")],
    );
    const b = makeBucket(
      SOURCE_B,
      [],
      [tokenRow(SOURCE_B, "--brand-primary", "#0000ff")],
    );
    const merged = mergeBuckets(a, b);
    expect(merged.tokens).toHaveLength(2);
    // Same token name, different sources, distinct IDs — both survive.
    expect(merged.tokens.map((t) => t.resolved_value).sort()).toEqual([
      "#0000ff",
      "#f97316",
    ]);
  });

  it("throws when given zero buckets", () => {
    expect(() => mergeBuckets()).toThrow(/at least one/);
  });

  it("schema field on the merged bucket is ghost.bucket/v1", () => {
    const a = makeBucket(SOURCE_A);
    const merged = mergeBuckets(a);
    expect(merged.schema).toBe("ghost.bucket/v1");
  });
});
