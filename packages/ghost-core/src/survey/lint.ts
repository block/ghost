import type { ZodIssue } from "zod";
import {
  componentRowId,
  tokenRowId,
  uiSurfaceRowId,
  valueRowId,
} from "./id.js";
import { RECOMMENDED_VALUE_KINDS, SurveySchema } from "./schema.js";
import type { Survey } from "./types.js";

export type SurveyLintSeverity = "error" | "warning" | "info";

export interface SurveyLintIssue {
  severity: SurveyLintSeverity;
  rule: string;
  message: string;
  /** Dotted path within the survey (e.g. `values[3].id`). */
  path?: string;
}

export interface SurveyLintReport {
  issues: SurveyLintIssue[];
  errors: number;
  warnings: number;
  info: number;
}

export const SURVEY_FILENAME = "survey.json";

/**
 * Lint a parsed survey object against `ghost.survey/v2`.
 *
 * Errors: schema violations (missing fields, wrong types, bad enum values).
 * Warnings: unknown value kinds (open-enum policy), ID mismatches (a row's
 * recorded `id` doesn't match what the deterministic generator would
 * produce for its content), and scan coverage gaps.
 * Errors: duplicate IDs within the same survey.
 */
export function lintSurvey(input: unknown): SurveyLintReport {
  const issues: SurveyLintIssue[] = [];

  const result = SurveySchema.safeParse(input);
  if (!result.success) {
    for (const issue of zodIssues(result.error.issues)) {
      issues.push(issue);
    }
    return finalize(issues);
  }

  const survey = result.data as Survey;

  checkSourceGraph(survey, issues);
  checkUiSurfaceCoverage(survey, issues);

  // Open-enum kind warnings.
  survey.values.forEach((row, idx) => {
    if (!RECOMMENDED_VALUE_KINDS.includes(row.kind)) {
      issues.push({
        severity: "warning",
        rule: "value-kind-unknown",
        message: `value row uses non-recommended kind '${row.kind}' — accepted, but cross-fleet tooling may not canonicalize it`,
        path: `values[${idx}].kind`,
      });
    }
  });

  survey.values.forEach((row, idx) => {
    checkResolution(row.resolution, `values[${idx}].resolution`, issues);
  });
  survey.tokens.forEach((row, idx) => {
    checkResolution(row.resolution, `tokens[${idx}].resolution`, issues);
  });

  // Deterministic-ID checks: each row's recorded id must match what the
  // generator would produce for its content. Catches scanners that mint
  // IDs incorrectly and breaks idempotent merge if not enforced.
  survey.values.forEach((row, idx) => {
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
  survey.tokens.forEach((row, idx) => {
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
  survey.components.forEach((row, idx) => {
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
  survey.ui_surfaces.forEach((row, idx) => {
    const expected = uiSurfaceRowId(
      row.source,
      row.name,
      row.kind,
      row.locator,
    );
    if (row.id !== expected) {
      issues.push({
        severity: "warning",
        rule: "id-mismatch",
        message: `id '${row.id}' does not match generator output '${expected}'`,
        path: `ui_surfaces[${idx}].id`,
      });
    }
  });

  // Duplicate-id checks within a single section. (Cross-section duplicates
  // are fine since IDs include a section tag.) Within-survey duplicates
  // mean the scanner emitted two rows with the same content, which the
  // recorder should have merged.
  for (const section of [
    "values",
    "tokens",
    "components",
    "ui_surfaces",
  ] as const) {
    const seen = new Map<string, number>();
    survey[section].forEach((row, idx) => {
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

function checkUiSurfaceCoverage(
  survey: Survey,
  issues: SurveyLintIssue[],
): void {
  if (survey.ui_surfaces.length > 0) return;
  issues.push({
    severity: "warning",
    rule: "ui-surfaces-empty",
    message:
      "survey.ui_surfaces is empty; this is only acceptable when map.md declares surface_sources.render_strategy: unknown and the scan notes the coverage gap.",
    path: "ui_surfaces",
  });
}

function checkSourceGraph(survey: Survey, issues: SurveyLintIssue[]): void {
  const hasRoles = survey.sources.some((source) => source.role);
  if (!hasRoles) return;

  const primaryCount = survey.sources.filter(
    (source) => source.role === "primary",
  ).length;
  if (primaryCount !== 1) {
    issues.push({
      severity: "warning",
      rule: "source-graph-primary-count",
      message:
        "survey.sources should include exactly one primary source when source roles are used.",
      path: "sources",
    });
  }
}

function checkResolution(
  resolution: Survey["values"][number]["resolution"] | undefined,
  path: string,
  issues: SurveyLintIssue[],
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

function zodIssues(issues: ZodIssue[]): SurveyLintIssue[] {
  return issues.map((issue) => ({
    severity: "error" as const,
    rule: `schema/${issue.code}`,
    message: issue.message,
    path: formatZodPath(issue.path),
  }));
}

function formatZodPath(path: ZodIssue["path"]): string | undefined {
  if (path.length === 0) return undefined;
  return path.reduce<string>((formatted, segment) => {
    if (typeof segment === "number") return `${formatted}[${segment}]`;
    const key = String(segment);
    return formatted ? `${formatted}.${key}` : key;
  }, "");
}

function finalize(issues: SurveyLintIssue[]): SurveyLintReport {
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
