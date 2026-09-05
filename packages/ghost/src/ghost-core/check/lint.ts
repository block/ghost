import { parseCheckMarkdown } from "./parse.js";
import { parseCheckReference } from "./reference.js";
import {
  GHOST_CHECK_SEVERITIES,
  type GhostCheckLintIssue,
  type GhostCheckLintReport,
} from "./types.js";

/**
 * Lint a ghost check markdown file (`ghost.check/v1`): required frontmatter
 * (`name`, `description`, `severity`), optional `references`, and a non-empty
 * body. ghost never executes the check — this only validates
 * that it is well-formed.
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

  const references = frontmatter.references;
  if (references !== undefined) {
    if (!Array.isArray(references)) {
      issues.push({
        severity: "error",
        rule: "check-references-invalid",
        message: "references must be an array of node refs",
        path: "references",
      });
    } else {
      references.forEach((reference, index) => {
        if (
          typeof reference !== "string" ||
          parseCheckReference(reference) === null
        ) {
          issues.push({
            severity: "warning",
            rule: "check-reference-malformed",
            message:
              "references entries should be node path ids with optional `> Heading` anchors (e.g. 'checkout/payment > Confirmation')",
            path: `references[${index}]`,
          });
        }
      });
    }
  }

  const source = frontmatter.source;
  if (source !== undefined) {
    if (typeof source !== "string" || parseCheckReference(source) === null) {
      issues.push({
        severity: "warning",
        rule: "check-source-malformed",
        message:
          "source should be a node id with an optional `> Heading` anchor; use `references` instead",
        path: "source",
      });
    } else {
      issues.push({
        severity: "warning",
        rule: "check-source-deprecated",
        message:
          "`source` is deprecated; replace it with `references:\n  - <node-id>`",
        path: "source",
      });
    }
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
