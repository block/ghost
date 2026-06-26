export const GHOST_CHECK_SCHEMA = "ghost.check/v1" as const;

/** Severity vocabulary, matching the established agent-check format. */
export const GHOST_CHECK_SEVERITIES = ["high", "medium", "low"] as const;
export type GhostCheckMarkdownSeverity =
  (typeof GHOST_CHECK_SEVERITIES)[number];

/**
 * A Ghost check: markdown + frontmatter, evaluated by an agent — never run by
 * Ghost. Shape-compatible with the established `.agents/checks` format, plus the
 * Ghost addition `surface:` (the placement that routes the check, mirroring node
 * placement). See docs/ideas/phase-7b-grounded-checks.md.
 */
export interface GhostCheckFrontmatter {
  name: string;
  description: string;
  severity: GhostCheckMarkdownSeverity;
  /** Tools the check is allowed to use (passthrough for the review pipeline). */
  tools?: string[];
  /** Max tool-use turns the check should spend (passthrough). */
  turn_limit?: number;
  /**
   * The surface this check governs. Ghost routes a diff to surfaces and selects
   * checks placed on the touched surfaces and their ancestors. Absent means the
   * check governs the implicit `core` (applies everywhere).
   */
  surface?: string;
}

export interface GhostCheckDocument {
  frontmatter: GhostCheckFrontmatter;
  /** The markdown body: prose instructions for the evaluating agent. */
  body: string;
}

export type GhostCheckLintSeverity = "error" | "warning" | "info";

export interface GhostCheckLintIssue {
  severity: GhostCheckLintSeverity;
  rule: string;
  message: string;
  path: string;
}

export interface GhostCheckLintReport {
  issues: GhostCheckLintIssue[];
  errors: number;
  warnings: number;
  info: number;
}
