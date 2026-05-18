import { getEffectiveMapScopes } from "../map/index.js";
import { GhostChecksSchema } from "./schema.js";
import type {
  GhostCheck,
  GhostChecksDocument,
  GhostChecksLintIssue,
  GhostChecksLintOptions,
  GhostChecksLintReport,
} from "./types.js";

const SUPPORT_FLOOR = 0.85;

export function lintGhostChecks(
  input: unknown,
  options: GhostChecksLintOptions = {},
): GhostChecksLintReport {
  const issues: GhostChecksLintIssue[] = [];
  const result = GhostChecksSchema.safeParse(input);
  if (!result.success) {
    for (const issue of result.error.issues) {
      issues.push({
        severity: "error",
        rule: `schema/${issue.code}`,
        message: issue.message,
        path: issue.path.length ? issue.path.join(".") : undefined,
      });
    }
    return finalize(issues);
  }

  const doc = result.data as GhostChecksDocument;
  checkDuplicateIds(doc.checks, issues);
  doc.checks.forEach((check, index) => {
    checkOne(check, index, options, issues);
  });

  return finalize(issues);
}

function checkDuplicateIds(
  checks: GhostCheck[],
  issues: GhostChecksLintIssue[],
): void {
  const seen = new Map<string, number>();
  checks.forEach((check, index) => {
    const previous = seen.get(check.id);
    if (previous !== undefined) {
      issues.push({
        severity: "error",
        rule: "duplicate-check-id",
        message: `check id '${check.id}' is duplicated (also at checks[${previous}])`,
        path: `checks[${index}].id`,
      });
    } else {
      seen.set(check.id, index);
    }
  });
}

function checkOne(
  check: GhostCheck,
  index: number,
  options: GhostChecksLintOptions,
  issues: GhostChecksLintIssue[],
): void {
  const path = `checks[${index}]`;
  checkDetector(check, path, issues);

  if (check.status === "disabled") return;

  if (!check.applies_to?.paths?.length && !check.applies_to?.scopes?.length) {
    issues.push({
      severity: check.status === "active" ? "error" : "warning",
      rule: "check-scope-missing",
      message:
        "Checks must declare applies_to.paths or applies_to.scopes so routing is deterministic.",
      path: `${path}.applies_to`,
    });
  }

  if (options.map && check.applies_to?.scopes?.length) {
    const scopeIds = new Set(
      getEffectiveMapScopes(options.map).map((scope) => scope.id),
    );
    check.applies_to.scopes.forEach((scope, scopeIndex) => {
      if (scopeIds.has(scope)) return;
      issues.push({
        severity: "error",
        rule: "check-scope-unknown",
        message: `Check references unknown map scope '${scope}'.`,
        path: `${path}.applies_to.scopes[${scopeIndex}]`,
      });
    });
  }

  if (!check.evidence) {
    issues.push({
      severity: check.status === "active" ? "error" : "warning",
      rule: "check-evidence-missing",
      message:
        "Checks must include evidence with support, observed_count, and examples before they can be trusted.",
      path: `${path}.evidence`,
    });
    return;
  }

  if (typeof check.evidence.support !== "number") {
    issues.push({
      severity: check.status === "active" ? "error" : "warning",
      rule: "check-support-missing",
      message: "Check evidence must include support.",
      path: `${path}.evidence.support`,
    });
  } else if (check.evidence.support < SUPPORT_FLOOR) {
    issues.push({
      severity: "warning",
      rule: "check-support-low",
      message: `Check support ${check.evidence.support.toFixed(2)} is below ${SUPPORT_FLOOR}; promote only if the curator intentionally accepts noise.`,
      path: `${path}.evidence.support`,
    });
  }

  if (typeof check.evidence.observed_count !== "number") {
    issues.push({
      severity: check.status === "active" ? "error" : "warning",
      rule: "check-observed-count-missing",
      message: "Check evidence must include observed_count.",
      path: `${path}.evidence.observed_count`,
    });
  }

  if (!check.evidence.examples?.length) {
    issues.push({
      severity: check.status === "active" ? "error" : "warning",
      rule: "check-examples-missing",
      message: "Check evidence must cite at least one precedent example.",
      path: `${path}.evidence.examples`,
    });
  }
}

function checkDetector(
  check: GhostCheck,
  path: string,
  issues: GhostChecksLintIssue[],
): void {
  const { detector } = check;
  if (
    detector.type === "forbidden-regex" ||
    detector.type === "required-regex"
  ) {
    if (!detector.pattern) {
      issues.push({
        severity: "error",
        rule: "check-detector-pattern-missing",
        message: `${detector.type} detectors must include pattern.`,
        path: `${path}.detector.pattern`,
      });
      return;
    }
    compileRegex(detector.pattern, `${path}.detector.pattern`, issues);
    return;
  }

  if (!detector.pattern && !detector.value) {
    issues.push({
      severity: "error",
      rule: "check-detector-value-missing",
      message: `${detector.type} detectors must include pattern or value.`,
      path: `${path}.detector`,
    });
    return;
  }
  if (detector.pattern) {
    compileRegex(detector.pattern, `${path}.detector.pattern`, issues);
  }
}

function compileRegex(
  pattern: string,
  path: string,
  issues: GhostChecksLintIssue[],
): void {
  try {
    new RegExp(pattern);
  } catch (err) {
    issues.push({
      severity: "error",
      rule: "check-detector-pattern-invalid",
      message: `Detector pattern is not a valid JavaScript regular expression: ${
        err instanceof Error ? err.message : String(err)
      }`,
      path,
    });
  }
}

function finalize(issues: GhostChecksLintIssue[]): GhostChecksLintReport {
  return {
    issues,
    errors: issues.filter((issue) => issue.severity === "error").length,
    warnings: issues.filter((issue) => issue.severity === "warning").length,
    info: issues.filter((issue) => issue.severity === "info").length,
  };
}
