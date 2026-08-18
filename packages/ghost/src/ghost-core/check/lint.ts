import { parseGuidanceRef } from "./guidance-ref.js";
import { parseCheckMarkdown } from "./parse.js";
import {
  GHOST_CHECK_SEVERITIES,
  type GhostCheckLintIssue,
  type GhostCheckLintReport,
} from "./types.js";

/**
 * Lint a ghost check markdown file (`ghost.check/v2`): required frontmatter
 * (`context`, `severity`, `references`) and a non-empty body. ghost never
 * executes the check, it only validates that review assertions are grounded in
 * guidance refs.
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

  requireContext(frontmatter, issues);
  requireSeverity(frontmatter, issues);
  requireReferences(frontmatter, issues);
  rejectUnknownFrontmatter(frontmatter, issues);

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

function requireContext(
  frontmatter: Record<string, unknown>,
  issues: GhostCheckLintIssue[],
): void {
  const value = frontmatter.context;
  if (typeof value === "string" && value.trim().length > 0) return;

  const hasAgentsShape =
    typeof frontmatter.name === "string" &&
    frontmatter.name.trim().length > 0 &&
    typeof frontmatter.description === "string" &&
    frontmatter.description.trim().length > 0;
  issues.push({
    severity: "error",
    rule: "check-context-missing",
    message: hasAgentsShape
      ? "check uses the .agents/checks format; move the applicability statement from `description` to `context`, and add resolving `references` to guidance nodes"
      : "frontmatter must declare a non-empty context",
    path: "context",
  });
}

function requireSeverity(
  frontmatter: Record<string, unknown>,
  issues: GhostCheckLintIssue[],
): void {
  const severity = frontmatter.severity;
  if (severity === undefined) {
    issues.push({
      severity: "error",
      rule: "check-severity-missing",
      message: "frontmatter must declare a severity",
      path: "severity",
    });
    return;
  }
  if (
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
}

function requireReferences(
  frontmatter: Record<string, unknown>,
  issues: GhostCheckLintIssue[],
): void {
  const references = frontmatter.references;
  if (references === undefined) {
    issues.push({
      severity: "error",
      rule: "check-references-missing",
      message: "frontmatter must declare non-empty references",
      path: "references",
    });
    return;
  }
  if (!Array.isArray(references)) {
    issues.push({
      severity: "error",
      rule: "check-references-invalid",
      message: "references must be an array of node refs",
      path: "references",
    });
    return;
  }
  if (references.length === 0) {
    issues.push({
      severity: "error",
      rule: "check-references-missing",
      message: "frontmatter must declare at least one reference",
      path: "references",
    });
    return;
  }

  references.forEach((reference, index) => {
    if (typeof reference !== "string" || parseGuidanceRef(reference) === null) {
      issues.push({
        severity: "error",
        rule: "check-reference-malformed",
        message:
          "references entries must be node ids with optional `> Heading` anchors (e.g. 'checkout/payment > Confirmation')",
        path: `references[${index}]`,
      });
    }
  });
}

function rejectUnknownFrontmatter(
  frontmatter: Record<string, unknown>,
  issues: GhostCheckLintIssue[],
): void {
  const allowed = new Set(["context", "severity", "references"]);
  for (const key of Object.keys(frontmatter).sort()) {
    if (allowed.has(key)) continue;
    issues.push({
      severity: "error",
      rule: "check-frontmatter-unknown-key",
      message:
        "check frontmatter may only declare `context`, `severity`, and `references`; remove retired keys such as `name`, `description`, `source`, `tools`, or `turn_limit`",
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
