import type { ZodIssue } from "zod";
import { componentRowId, tokenRowId, valueRowId } from "./id.js";
import { BucketSchema, RECOMMENDED_VALUE_KINDS } from "./schema.js";
import type { Bucket } from "./types.js";

export type BucketLintSeverity = "error" | "warning" | "info";

export interface BucketLintIssue {
  severity: BucketLintSeverity;
  rule: string;
  message: string;
  /** Dotted path within the bucket (e.g. `values[3].id`). */
  path?: string;
}

export interface BucketLintReport {
  issues: BucketLintIssue[];
  errors: number;
  warnings: number;
  info: number;
}

export const BUCKET_FILENAME = "bucket.json";

/**
 * Lint a parsed bucket object against `ghost.bucket/v1`.
 *
 * Errors: schema violations (missing fields, wrong types, bad enum values).
 * Warnings: unknown value kinds (open-enum policy), ID mismatches (a row's
 * recorded `id` doesn't match what the deterministic generator would
 * produce for its content), duplicate IDs within the same bucket.
 */
export function lintBucket(input: unknown): BucketLintReport {
  const issues: BucketLintIssue[] = [];

  const result = BucketSchema.safeParse(input);
  if (!result.success) {
    for (const issue of zodIssues(result.error.issues)) {
      issues.push(issue);
    }
    return finalize(issues);
  }

  const bucket = result.data as Bucket;

  checkSourceGraph(bucket, issues);

  // Open-enum kind warnings.
  bucket.values.forEach((row, idx) => {
    if (!RECOMMENDED_VALUE_KINDS.includes(row.kind)) {
      issues.push({
        severity: "warning",
        rule: "value-kind-unknown",
        message: `value row uses non-recommended kind '${row.kind}' — accepted, but cross-fleet tooling may not canonicalize it`,
        path: `values[${idx}].kind`,
      });
    }
  });

  bucket.values.forEach((row, idx) => {
    checkResolution(row.resolution, `values[${idx}].resolution`, issues);
  });
  bucket.tokens.forEach((row, idx) => {
    checkResolution(row.resolution, `tokens[${idx}].resolution`, issues);
  });

  // Deterministic-ID checks: each row's recorded id must match what the
  // generator would produce for its content. Catches scanners that mint
  // IDs incorrectly and breaks idempotent merge if not enforced.
  bucket.values.forEach((row, idx) => {
    const expected = valueRowId(row.source, row.kind, row.value, row.raw);
    if (row.id !== expected) {
      issues.push({
        severity: "warning",
        rule: "id-mismatch",
        message: `id '${row.id}' does not match generator output '${expected}' — re-derive via valueRowId(...) to keep merges idempotent`,
        path: `values[${idx}].id`,
      });
    }
  });
  bucket.tokens.forEach((row, idx) => {
    const expected = tokenRowId(row.source, row.name);
    if (row.id !== expected) {
      issues.push({
        severity: "warning",
        rule: "id-mismatch",
        message: `id '${row.id}' does not match generator output '${expected}'`,
        path: `tokens[${idx}].id`,
      });
    }
  });
  bucket.components.forEach((row, idx) => {
    const expected = componentRowId(row.source, row.name);
    if (row.id !== expected) {
      issues.push({
        severity: "warning",
        rule: "id-mismatch",
        message: `id '${row.id}' does not match generator output '${expected}'`,
        path: `components[${idx}].id`,
      });
    }
  });

  // Duplicate-id checks within a single section. (Cross-section duplicates
  // are fine since IDs include a section tag.) Within-bucket duplicates
  // mean the scanner emitted two rows with the same content, which the
  // recorder should have merged.
  for (const section of ["values", "tokens", "components"] as const) {
    const seen = new Map<string, number>();
    bucket[section].forEach((row, idx) => {
      const prev = seen.get(row.id);
      if (prev !== undefined) {
        issues.push({
          severity: "error",
          rule: "duplicate-id",
          message: `duplicate id '${row.id}' in ${section} (also at ${section}[${prev}])`,
          path: `${section}[${idx}].id`,
        });
      } else {
        seen.set(row.id, idx);
      }
    });
  }

  return finalize(issues);
}

function checkSourceGraph(bucket: Bucket, issues: BucketLintIssue[]): void {
  const hasRoles = bucket.sources.some((source) => source.role);
  if (!hasRoles) return;

  const primaryCount = bucket.sources.filter(
    (source) => source.role === "primary",
  ).length;
  if (primaryCount !== 1) {
    issues.push({
      severity: "warning",
      rule: "source-graph-primary-count",
      message:
        "bucket.sources should include exactly one primary source when source roles are used.",
      path: "sources",
    });
  }
}

function checkResolution(
  resolution: Bucket["values"][number]["resolution"] | undefined,
  path: string,
  issues: BucketLintIssue[],
): void {
  if (!resolution) return;
  if (
    resolution.status === "resolved" &&
    !resolution.source_id &&
    !resolution.target
  ) {
    issues.push({
      severity: "warning",
      rule: "resolution-source-missing",
      message:
        "resolved rows should name a resolver via `source_id` or `target`.",
      path,
    });
  }
  if (
    resolution.status !== "resolved" &&
    !resolution.symbol &&
    !resolution.message
  ) {
    issues.push({
      severity: "info",
      rule: "resolution-unresolved-context-missing",
      message:
        "unresolved rows should include `symbol` or `message` so the profile can surface coverage gaps.",
      path,
    });
  }
}

function zodIssues(issues: ZodIssue[]): BucketLintIssue[] {
  return issues.map((issue) => ({
    severity: "error" as const,
    rule: `schema/${issue.code}`,
    message: issue.message,
    path: issue.path.join("."),
  }));
}

function finalize(issues: BucketLintIssue[]): BucketLintReport {
  let errors = 0;
  let warnings = 0;
  let info = 0;
  for (const issue of issues) {
    if (issue.severity === "error") errors++;
    else if (issue.severity === "warning") warnings++;
    else info++;
  }
  return { issues, errors, warnings, info };
}
