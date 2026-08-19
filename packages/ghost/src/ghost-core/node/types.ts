import type { GhostMaterial } from "../materials.js";

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
   * Retrieval payload shown by gather: the situation or activity this
   * guidance is for, never an audience. Together with the node's id, it is
   * how an agent decides applicability. Optional, but strongly encouraged on
   * any node worth anchoring a task at.
   */
  for?: string;
  /**
   * Optional locators for the concrete materials this guidance is about:
   * explicit repo-relative file paths and supported external locators. Glob
   * patterns are not supported and fail validation. A locator may be a bare
   * string or an object with a short retrieval note. Guidance stays in
   * prose; this list only says where the material can be found.
   */
  materials?: GhostMaterial[];
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
