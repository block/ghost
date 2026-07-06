export const GHOST_CHECK_SCHEMA = "ghost.check/v1" as const;

export const GHOST_CHECK_DETECTOR_TYPES = [
  "forbidden-regex",
  "required-regex",
] as const;
export type GhostCheckDetectorType =
  (typeof GHOST_CHECK_DETECTOR_TYPES)[number];

export interface GhostCheckDetector {
  type: GhostCheckDetectorType;
  pattern: string;
  flags?: string;
  /** Optional glob-like path filters within the reviewed diff. */
  paths?: string[];
}

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
   * The fingerprint prose this check enforces, as node path ids with optional
   * `> Heading` anchors (`checkout/payment > Confirmation`). Unresolved refs are
   * tolerated by validation as warnings: they may name not-yet-written prose.
   */
  references?: string[];
  /** Deprecated single-reference alias retained for artifact-level linting. */
  source?: string;
  /** Optional stable id for deterministic check reports. Defaults to name slug. */
  id?: string;
  /** Optional PR-comment title. Defaults to description, then name. */
  title?: string;
  /** Optional message for deterministic check reports. Defaults to description. */
  message?: string;
  /** Optional repair guidance surfaced with deterministic findings. */
  repair?: string;
  /** Optional deterministic detector. If omitted, Ghost routes the check but does not run it. */
  detector?: GhostCheckDetector;
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
