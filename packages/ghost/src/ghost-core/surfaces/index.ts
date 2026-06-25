/**
 * Public surface for `ghost.surfaces/v1` schema and types.
 *
 * Phase 1 ships schema + types only. Lint (graph validation) is Phase 2; the
 * disk loader and CLI wiring come later. See docs/ideas/phase-1-plan.md.
 */

export { lintGhostSurfaces } from "./lint.js";
export { GhostSurfacesSchema } from "./schema.js";
export {
  GHOST_SURFACE_EDGE_KINDS,
  GHOST_SURFACE_ROOT_ID,
  GHOST_SURFACES_SCHEMA,
  GHOST_SURFACES_YML_FILENAME,
  type GhostSurface,
  type GhostSurfaceEdge,
  type GhostSurfaceEdgeKind,
  type GhostSurfacesDocument,
  type GhostSurfacesLintIssue,
  type GhostSurfacesLintReport,
  type GhostSurfacesLintSeverity,
} from "./types.js";
