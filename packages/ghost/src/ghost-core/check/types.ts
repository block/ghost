export const GHOST_CHECK_SCHEMA = "ghost.check/v1" as const;

/** Severity vocabulary, matching the established agent-check format. */
export const GHOST_CHECK_SEVERITIES = ["high", "medium", "low"] as const;
export type GhostCheckMarkdownSeverity =
  (typeof GHOST_CHECK_SEVERITIES)[number];

/**
 * A ghost check: markdown + frontmatter, evaluated by an agent — never run by
 * ghost. Shape-compatible with the established `.agents/checks` format, plus the
 * ghost addition `source:` (the fingerprint prose the check enforces). Every
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
   * The fingerprint prose this check enforces, as node path ids with optional
   * `> Heading` anchors (`checkout/payment > Confirmation`). Unresolved refs are
   * tolerated by validation as warnings: they may name not-yet-written prose.
   */
  references?: string[];
  /** Deprecated single-reference alias retained for artifact-level linting. */
  source?: string;
  /** Optional repo-owned shell probe run by `ghost review` as evidence only. */
  probe?: string;
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
