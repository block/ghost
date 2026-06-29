import { parseCheckMarkdown } from "./parse.js";
import {
  GHOST_CHECK_SEVERITIES,
  type GhostCheckLintIssue,
  type GhostCheckLintReport,
} from "./types.js";

const SURFACE_ID = /^[a-z0-9][a-z0-9_-]*$/;

/**
 * Lint a Ghost check markdown file (`ghost.check/v1`): required frontmatter
 * (`name`, `description`, `severity`), a known severity, a flat-slug `surface`
 * when present, and a non-empty body. Ghost never executes the check — this only
 * validates that it is well-formed and routable.
 */
export function lintGhostCheck(raw: string): GhostCheckLintReport {
  const issues: GhostCheckLintIssue[] = [];
  const { frontmatter, body } = parseCheckMarkdown(raw);

  if (frontmatter === null) {
    issues.push({
      severity: "error",
      rule: "check-frontmatter-missing",
      message:
        "check must begin with a YAML frontmatter block delimited by `---` lines",
      path: "<frontmatter>",
    });
    return finalize(issues);
  }

  requireString(frontmatter, "name", issues);
  requireString(frontmatter, "description", issues);

  const severity = frontmatter.severity;
  if (severity === undefined) {
    issues.push({
      severity: "error",
      rule: "check-severity-missing",
      message: "frontmatter must declare a severity",
      path: "severity",
    });
  } else if (
    typeof severity !== "string" ||
    !GHOST_CHECK_SEVERITIES.includes(severity as never)
  ) {
    issues.push({
      severity: "error",
      rule: "check-severity-invalid",
      message: `severity must be one of: ${GHOST_CHECK_SEVERITIES.join(", ")}`,
      path: "severity",
    });
  }

  const surface = frontmatter.surface;
  if (surface !== undefined) {
    if (typeof surface !== "string" || !SURFACE_ID.test(surface)) {
      issues.push({
        severity: "error",
        rule: "check-surface-invalid",
        message:
          "surface must be a flat slug (lowercase alphanumeric plus _ -, no dots)",
        path: "surface",
      });
    }
  } else {
    issues.push({
      severity: "warning",
      rule: "check-surface-unplaced",
      message:
        "check has no surface; it will govern the implicit `core` (applies everywhere). Add `surface:` to scope it.",
      path: "surface",
    });
  }

  if (body.trim().length === 0) {
    issues.push({
      severity: "error",
      rule: "check-body-empty",
      message: "check body must contain instructions for the evaluating agent",
      path: "<body>",
    });
  }

  return finalize(issues);
}

function requireString(
  frontmatter: Record<string, unknown>,
  key: string,
  issues: GhostCheckLintIssue[],
): void {
  const value = frontmatter[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    issues.push({
      severity: "error",
      rule: `check-${key}-missing`,
      message: `frontmatter must declare a non-empty ${key}`,
      path: key,
    });
  }
}

function finalize(issues: GhostCheckLintIssue[]): GhostCheckLintReport {
  return {
    issues,
    errors: issues.filter((issue) => issue.severity === "error").length,
    warnings: issues.filter((issue) => issue.severity === "warning").length,
    info: issues.filter((issue) => issue.severity === "info").length,
  };
}
