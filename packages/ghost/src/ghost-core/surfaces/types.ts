export const GHOST_SURFACES_SCHEMA = "ghost.surfaces/v1" as const;
export const GHOST_SURFACES_YML_FILENAME = "surfaces.yml" as const;

/** The implicit root every node ultimately descends from. */
export const GHOST_SURFACE_ROOT_ID = "core" as const;

/**
 * `surfaces.yml` is an optional terse spine file: a place to declare bare tree
 * positions (id + parent) in one file rather than as bodyless node files. It
 * folds into the same node id space at load time — a position that needs
 * guidance is simply a node with that id. Lateral composition lives on node
 * `relates`, never here (the old surface edge vocabulary is gone).
 */
export interface GhostSurface {
  id: string;
  description?: string;
  /**
   * The single containment parent. Absent means a top-level position under the
   * implicit `core` root. Containment lives only here; the id never encodes
   * hierarchy (see GhostSurfacesSchema id rules).
   */
  parent?: string;
}

export interface GhostSurfacesDocument {
  schema: typeof GHOST_SURFACES_SCHEMA;
  surfaces: GhostSurface[];
}

/**
 * Lint report types reuse the fingerprint facet shape verbatim so Phase 2 and
 * the CLI can treat all facet lint reports uniformly.
 */
export type GhostSurfacesLintSeverity = "error" | "warning" | "info";

export interface GhostSurfacesLintIssue {
  severity: GhostSurfacesLintSeverity;
  rule: string;
  message: string;
  path?: string;
}

export interface GhostSurfacesLintReport {
  issues: GhostSurfacesLintIssue[];
  errors: number;
  warnings: number;
  info: number;
}
