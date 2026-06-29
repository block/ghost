export const GHOST_SURFACES_SCHEMA = "ghost.surfaces/v1" as const;
export const GHOST_SURFACES_YML_FILENAME = "surfaces.yml" as const;

/**
 * The fixed, Ghost-owned edge vocabulary for the composition graph.
 *
 * Closed by design (see docs/ideas/surface-schema.md): an open vocabulary would
 * make Ghost a general-purpose graph database and lose the interface-composition
 * focus. Edges express how interface surfaces relate; richer consumers extend
 * edges consumer-side, never by opening this set. This is a code constant, never
 * package data.
 */
export const GHOST_SURFACE_EDGE_KINDS = ["composes", "governed-by"] as const;
export type GhostSurfaceEdgeKind = (typeof GHOST_SURFACE_EDGE_KINDS)[number];

/** The implicit root surface every surface ultimately descends from. */
export const GHOST_SURFACE_ROOT_ID = "core" as const;

export interface GhostSurfaceEdge {
  kind: GhostSurfaceEdgeKind;
  to: string;
}

export interface GhostSurface {
  id: string;
  description?: string;
  /**
   * The single containment parent. Absent means a top-level surface under the
   * implicit `core` root. This is the only place containment is expressed; the
   * id never encodes hierarchy (see GhostSurfacesSchema id rules).
   */
  parent?: string;
  /**
   * Typed composition edges to other surfaces (the Layer 3 composition graph).
   * Edges never imply containment and never cascade.
   */
  edges?: GhostSurfaceEdge[];
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
