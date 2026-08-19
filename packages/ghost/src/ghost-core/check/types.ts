export const GHOST_CHECK_SCHEMA = "ghost.check/v2" as const;

/** Severity vocabulary for agent-evaluated review assertions. */
export const GHOST_CHECK_SEVERITIES = ["high", "medium", "low"] as const;
export type GhostCheckMarkdownSeverity =
  (typeof GHOST_CHECK_SEVERITIES)[number];

/**
 * A ghost check: markdown + frontmatter, evaluated by an agent, never run by
 * ghost. Compatibility with `.agents/checks` deliberately ended because
 * grounding every check in written guidance is mandatory.
 */
export interface GhostCheckFrontmatter {
  /** Durable semantic situation in which the check applies. */
  for: string;
  severity: GhostCheckMarkdownSeverity;
  /** Guidance node ids with optional `> Heading` anchors. */
  references: string[];
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
