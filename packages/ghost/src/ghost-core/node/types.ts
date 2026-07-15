export const GHOST_NODE_SCHEMA = "ghost.node/v1" as const;

/**
 * A node's frontmatter: descriptive properties only. Identity, kind, and
 * containment are not here — the file path is the node id, and the optional
 * filename prefix is the kind. The prose body carries the design expression;
 * why / with-what / how-assembled are drafting prompts, never fields.
 */
export interface GhostNodeFrontmatter {
  /** Free-form descriptive properties parsed from node frontmatter. */
  [key: string]: unknown;
  /**
   * Retrieval payload shown by gather: what the node governs, the observable
   * condition under which it applies, and what it contributes where useful.
   * Together with the node's id, it is how an agent decides applicability.
   * Optional, but strongly encouraged on any node worth anchoring a task at.
   */
  description?: string;
  /**
   * Optional locators for the concrete materials this truth is about: repo-relative
   * paths/globs and absolute https URLs. Guidance stays in prose; this list is
   * only where the agent or review harness can find the material.
   */
  materials?: string[];
}

export interface GhostNodeDocument {
  frontmatter: GhostNodeFrontmatter;
  /** The markdown body: prose design expression. */
  body: string;
}

export type GhostNodeLintSeverity = "error" | "warning" | "info";

export interface GhostNodeLintIssue {
  severity: GhostNodeLintSeverity;
  rule: string;
  message: string;
  path?: string;
}

export interface GhostNodeLintReport {
  issues: GhostNodeLintIssue[];
  errors: number;
  warnings: number;
  info: number;
}
