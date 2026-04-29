import { describe, expect, it } from "vitest";
import { valueRowId } from "../src/bucket/id.js";
import { lintBucket } from "../src/bucket/lint.js";
import type { Bucket, BucketSource } from "../src/bucket/types.js";

const SOURCE: BucketSource = {
  target: "github:block/ghost",
  commit: "abc123",
  scanned_at: "2026-04-29T12:00:00Z",
  scanner_version: "0.1.0",
};

function makeValueRow(
  kind: string,
  value: string,
  raw: string,
  overrides: Partial<{
    occurrences: number;
    files_count: number;
    role_hypothesis: string;
  }> = {},
) {
  return {
    id: valueRowId(SOURCE, kind, value, raw),
    source: SOURCE,
    kind,
    value,
    raw,
    occurrences: overrides.occurrences ?? 1,
    files_count: overrides.files_count ?? 1,
    role_hypothesis: overrides.role_hypothesis,
  };
}

function makeBucket(values: ReturnType<typeof makeValueRow>[] = []): Bucket {
  return {
    schema: "ghost.bucket/v1",
    sources: [SOURCE],
    values,
    tokens: [],
    components: [],
    libraries: [],
  };
}

describe("lintBucket", () => {
  it("accepts an empty well-formed bucket", () => {
    const report = lintBucket(makeBucket());
    expect(report.errors).toBe(0);
    expect(report.warnings).toBe(0);
  });

  it("accepts a bucket with recommended-kind value rows", () => {
    const bucket = makeBucket([
      makeValueRow("color", "#f97316", "bg-orange-500", {
        occurrences: 47,
        files_count: 12,
      }),
      makeValueRow("spacing", "8", "8px", {
        occurrences: 312,
        files_count: 89,
      }),
    ]);
    const report = lintBucket(bucket);
    expect(report.errors).toBe(0);
    expect(report.warnings).toBe(0);
  });

  it("rejects missing schema field", () => {
    const bucket: unknown = {
      ...makeBucket(),
      schema: "ghost.bucket/v0",
    };
    const report = lintBucket(bucket);
    expect(report.errors).toBeGreaterThan(0);
    expect(report.issues.some((i) => i.rule.startsWith("schema/"))).toBe(true);
  });

  it("rejects negative occurrences", () => {
    const row = makeValueRow("color", "#f97316", "#f97316");
    const report = lintBucket(makeBucket([{ ...row, occurrences: -1 }]));
    expect(report.errors).toBeGreaterThan(0);
  });

  it("warns on unknown value kinds without rejecting", () => {
    const bucket = makeBucket([
      makeValueRow("z-index", "10", "z-10"), // not in recommended set
    ]);
    const report = lintBucket(bucket);
    expect(report.errors).toBe(0);
    expect(report.warnings).toBeGreaterThan(0);
    expect(report.issues.some((i) => i.rule === "value-kind-unknown")).toBe(
      true,
    );
  });

  it("warns when a row's id does not match the deterministic generator", () => {
    const bucket = makeBucket([
      {
        ...makeValueRow("color", "#f97316", "#f97316"),
        id: "deadbeefdeadbeef", // hand-rolled, not from generator
      },
    ]);
    const report = lintBucket(bucket);
    expect(report.warnings).toBeGreaterThan(0);
    expect(report.issues.some((i) => i.rule === "id-mismatch")).toBe(true);
  });

  it("flags duplicate IDs within a section as errors", () => {
    const row = makeValueRow("color", "#f97316", "#f97316");
    const report = lintBucket(makeBucket([row, { ...row }])); // same ID, two rows
    expect(report.errors).toBeGreaterThan(0);
    expect(report.issues.some((i) => i.rule === "duplicate-id")).toBe(true);
  });

  it("rejects sources array with no entries", () => {
    const bucket: unknown = {
      ...makeBucket(),
      sources: [],
    };
    const report = lintBucket(bucket);
    expect(report.errors).toBeGreaterThan(0);
  });
});
