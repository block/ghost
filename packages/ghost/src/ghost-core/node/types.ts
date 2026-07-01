export const GHOST_NODE_SCHEMA = "ghost.node/v1" as const;

/**
 * A node's frontmatter: descriptive properties only. Identity, kind, and
 * containment are not here — they are the node's location in the directory tree
 * (the file path is the id; the optional filename prefix is the kind). The
 * prose body carries the design expression; intent / inventory / composition
 * are authorship lenses, never fields.
 */
export interface GhostNodeFrontmatter {
  /**
   * One-line statement of what this node is and when to gather it — the
   * retrieval payload. Together with the node's id (its path) it is how an
   * agent selects a node, exactly like a tool's name + description. The body is
   * the node's "implementation"; the description is what makes it discoverable.
   * Optional, but strongly encouraged on any node worth anchoring a task at.
   */
  description?: string;
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
