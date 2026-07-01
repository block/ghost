import { splitMarkdownFrontmatter } from "../markdown.js";
import { GhostNodeFrontmatterSchema } from "./schema.js";
import type {
  GhostNodeDocument,
  GhostNodeLintIssue,
  GhostNodeLintReport,
} from "./types.js";

export interface ParseNodeResult {
  /** The validated node, or null when the artifact failed to parse/validate. */
  node: GhostNodeDocument | null;
  report: GhostNodeLintReport;
}

function finalize(issues: GhostNodeLintIssue[]): GhostNodeLintReport {
  return {
    issues,
    errors: issues.filter((i) => i.severity === "error").length,
    warnings: issues.filter((i) => i.severity === "warning").length,
    info: issues.filter((i) => i.severity === "info").length,
  };
}

/**
 * Parse and validate a single `ghost.node/v1` markdown artifact (frontmatter +
 * prose body) in isolation. Per-node only: identity and well-formed links.
 * Cross-node graph rules (targets exist, one root, no cycles) are a
 * later phase.
 */
export function parseNode(raw: string): ParseNodeResult {
  const { frontmatter, body } = splitMarkdownFrontmatter(raw);
  if (frontmatter === null) {
    return {
      node: null,
      report: finalize([
        {
          severity: "error",
          rule: "node-missing-frontmatter",
          message:
            "node must begin with a YAML frontmatter block (---\\n<yaml>\\n---)",
        },
      ]),
    };
  }

  // The body is design-expression content; surrounding blank lines are not
  // meaningful. Normalize them so serialize → parse round-trips are stable.
  const normalizedBody = body.replace(/^\n+/, "").replace(/\s+$/, "");

  const result = GhostNodeFrontmatterSchema.safeParse(frontmatter);
  if (!result.success) {
    return {
      node: null,
      report: finalize(
        result.error.issues.map((issue) => ({
          severity: "error" as const,
          rule: `schema/${issue.code}`,
          message: issue.message,
          path: issue.path.length ? issue.path.join(".") : undefined,
        })),
      ),
    };
  }

  return {
    node: { frontmatter: result.data, body: normalizedBody },
    report: finalize([]),
  };
}

/** Lint a node artifact, returning only the report (per-node validation). */
export function lintGhostNode(raw: string): GhostNodeLintReport {
  return parseNode(raw).report;
}
