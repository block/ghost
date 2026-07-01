export const GHOST_NODE_SCHEMA = "ghost.node/v1" as const;

/**
 * The closed `relates` qualifier vocabulary: how one node relates laterally to
 * another. Closed by design (mirrors the surface edge vocabulary): an open set
 * would make Ghost a general graph database and lose the design-composition
 * focus. `governs` / `projects` are deliberately deferred (Scenario D and
 * explicit medium projection) — not in v1. A relation may also be untyped
 * (qualifier omitted), matching OKF's untyped-link default; the qualifier is the
 * machinery handle when the author states it.
 */
export const GHOST_NODE_RELATION_KINDS = [
  "reinforces",
  "contrasts",
  "variant",
] as const;
export type GhostNodeRelationKind = (typeof GHOST_NODE_RELATION_KINDS)[number];

/** A lateral link from one node to another, optionally typed. */
export interface GhostNodeRelation {
  /** Target node ref: `<id>` (local) or `<package>#<id>` (cross-package). */
  to: string;
  /** The relation kind. Absent means an untyped relate. */
  as?: GhostNodeRelationKind;
}

/**
 * A node's frontmatter: descriptive properties only. Identity and containment
 * are not here — they are the node's location in the directory tree (the file
 * path is the id; the containing directory is the parent). The prose body
 * carries the design expression; intent / inventory / composition are
 * authorship lenses, never fields.
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
  /** Typed lateral links to other nodes (composition graph). */
  relates?: GhostNodeRelation[];
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
