import { parseCheckMarkdown } from "./parse.js";
import { parseSourceRef } from "./source-ref.js";
import {
  GHOST_CHECK_DETECTOR_TYPES,
  GHOST_CHECK_SEVERITIES,
  type GhostCheckLintIssue,
  type GhostCheckLintReport,
} from "./types.js";

/**
 * Lint a Ghost check markdown file (`ghost.check/v1`): required frontmatter
 * (`name`, `description`, `severity`), an optional `source:` provenance pointer,
 * and a non-empty body. Ghost never executes the check — this only validates
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
          parseSourceRef(reference) === null
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
    // `source:` is a deprecated soft provenance pointer: `<node-id>` with an
    // optional `> <heading>` anchor. Keep linting it so older standalone check
    // files still get useful feedback.
    if (typeof source !== "string" || parseSourceRef(source) === null) {
      issues.push({
        severity: "warning",
        rule: "check-source-malformed",
        message:
          "source should be a node path id with an optional `> Heading` anchor (e.g. 'checkout/payment > Confirmation')",
        path: "source",
      });
    }
  }

  const detector = frontmatter.detector;
  if (detector !== undefined) {
    lintDetector(detector, issues);
  }

  for (const key of ["id", "title", "message", "repair"]) {
    const value = frontmatter[key];
    if (value !== undefined && typeof value !== "string") {
      issues.push({
        severity: "error",
        rule: `check-${key}-invalid`,
        message: `${key} must be a string when provided`,
        path: key,
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

function lintDetector(detector: unknown, issues: GhostCheckLintIssue[]): void {
  if (!detector || typeof detector !== "object" || Array.isArray(detector)) {
    issues.push({
      severity: "error",
      rule: "check-detector-invalid",
      message: "detector must be an object with type and pattern",
      path: "detector",
    });
    return;
  }

  const raw = detector as Record<string, unknown>;
  if (
    typeof raw.type !== "string" ||
    !GHOST_CHECK_DETECTOR_TYPES.includes(raw.type as never)
  ) {
    issues.push({
      severity: "error",
      rule: "check-detector-type-invalid",
      message: `detector.type must be one of: ${GHOST_CHECK_DETECTOR_TYPES.join(", ")}`,
      path: "detector.type",
    });
  }

  if (typeof raw.pattern !== "string" || raw.pattern.length === 0) {
    issues.push({
      severity: "error",
      rule: "check-detector-pattern-missing",
      message: "detector.pattern must be a non-empty regex string",
      path: "detector.pattern",
    });
  } else {
    try {
      new RegExp(raw.pattern);
    } catch (err) {
      issues.push({
        severity: "error",
        rule: "check-detector-pattern-invalid",
        message: `detector.pattern is not a valid regex: ${
          err instanceof Error ? err.message : String(err)
        }`,
        path: "detector.pattern",
      });
    }
  }

  if (raw.flags !== undefined && typeof raw.flags !== "string") {
    issues.push({
      severity: "error",
      rule: "check-detector-flags-invalid",
      message: "detector.flags must be a string when provided",
      path: "detector.flags",
    });
  }

  if (
    raw.paths !== undefined &&
    (!Array.isArray(raw.paths) ||
      raw.paths.some((path) => typeof path !== "string"))
  ) {
    issues.push({
      severity: "error",
      rule: "check-detector-paths-invalid",
      message: "detector.paths must be a string array when provided",
      path: "detector.paths",
    });
  }
}
