import { describe, expect, it } from "vitest";
import { recomputeBucketIds } from "../src/bucket/fix-ids.js";
import { tokenRowId, valueRowId } from "../src/bucket/id.js";
import type { Bucket, BucketSource } from "../src/bucket/types.js";

const SOURCE: BucketSource = {
  target: "github:block/ghost",
  commit: "abc123",
  scanned_at: "2026-04-29T12:00:00Z",
};

function bucket(): Bucket {
  return {
    schema: "ghost.bucket/v1",
    sources: [SOURCE],
    values: [
      {
        id: "",
        source: SOURCE,
        kind: "color",
        value: "#f97316",
        raw: "#f97316",
        occurrences: 1,
        files_count: 1,
      },
      {
        id: "wrong-id",
        source: SOURCE,
        kind: "spacing",
        value: "8",
        raw: "8px",
        occurrences: 1,
        files_count: 1,
      },
    ],
    tokens: [
      {
        id: "",
        source: SOURCE,
        name: "--brand-primary",
        alias_chain: [],
        resolved_value: "#f97316",
        occurrences: 1,
      },
    ],
    components: [],
  };
}

describe("recomputeBucketIds", () => {
  it("populates empty IDs with deterministic hashes", () => {
    const fixed = recomputeBucketIds(bucket());
    expect(fixed.values[0].id).toBe(
      valueRowId(SOURCE, "color", "#f97316", "#f97316"),
    );
    expect(fixed.tokens[0].id).toBe(tokenRowId(SOURCE, "--brand-primary"));
  });

  it("overwrites incorrect IDs with the correct deterministic hash", () => {
    const fixed = recomputeBucketIds(bucket());
    expect(fixed.values[1].id).toBe(valueRowId(SOURCE, "spacing", "8", "8px"));
    expect(fixed.values[1].id).not.toBe("wrong-id");
  });

  it("does not mutate the input bucket", () => {
    const input = bucket();
    recomputeBucketIds(input);
    expect(input.values[0].id).toBe("");
    expect(input.values[1].id).toBe("wrong-id");
  });

  it("is idempotent — running twice yields the same result", () => {
    const once = recomputeBucketIds(bucket());
    const twice = recomputeBucketIds(once);
    expect(twice.values).toEqual(once.values);
    expect(twice.tokens).toEqual(once.tokens);
  });
});
