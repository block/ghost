export const GHOST_CHECK_SCHEMA = "ghost.check/v1" as const;

/** Severity vocabulary, matching the established agent-check format. */
export const GHOST_CHECK_SEVERITIES = ["high", "medium", "low"] as const;
export type GhostCheckMarkdownSeverity =
  (typeof GHOST_CHECK_SEVERITIES)[number];

/**
 * A Ghost check: markdown + frontmatter, evaluated by an agent — never run by
 * Ghost. Shape-compatible with the established `.agents/checks` format, plus the
 * Ghost addition `source:` (the fingerprint prose the check enforces). Every
 * check is offered to the reviewer; the agent judges relevance.
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
   * Optional provenance: the fingerprint prose this check enforces, as a node
   * path id with an optional `> Heading` anchor (`checkout/payment > Confirmation`).
   * A soft pointer — `review` surfaces it so a finding can cite which section it
   * derives from. An unresolved `source:` is tolerated: it may name
   * not-yet-written prose.
   *
   * This is the check's only binding to the graph. Checks always fire; the host
   * agent judges relevance against the diff and the grounded prose. `source:`
   * tells it which prose the check enforces.
   */
  source?: string;
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
