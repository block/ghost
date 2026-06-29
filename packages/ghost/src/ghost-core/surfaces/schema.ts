import { z } from "zod";
import { GHOST_SURFACE_EDGE_KINDS, GHOST_SURFACES_SCHEMA } from "./types.js";

/**
 * Flat slug for surface ids. Note the dot is deliberately excluded: dotted ids
 * (`email.marketing`) are banned because the dot would pretend to be a `parent`
 * link, creating a second, conflicting source of truth for the tree. The tree
 * lives only in `parent` (see docs/ideas/surface-schema.md).
 */
const SurfaceIdSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9][a-z0-9_-]*$/, {
    message:
      "surface id must be a flat slug (lowercase alphanumeric plus _ -, no dots; the tree lives in parent)",
  });

const SurfaceEdgeSchema = z
  .object({
    kind: z.enum(GHOST_SURFACE_EDGE_KINDS),
    to: SurfaceIdSchema,
  })
  .strict();

const SurfaceSchema = z
  .object({
    id: SurfaceIdSchema,
    description: z.string().min(1).optional(),
    parent: SurfaceIdSchema.optional(),
    edges: z.array(SurfaceEdgeSchema).optional(),
  })
  .strict();

/**
 * Zod schema for `surfaces.yml` (`ghost.surfaces/v1`).
 *
 * This validates each node in isolation. Graph-level rules that need the whole
 * document — parent references an existing id, no cycles, edge `to` exists,
 * reserved `core`, near-miss ids — are deferred to Phase 2 lint, because Zod
 * cannot see the rest of the tree from a single node.
 */
export const GhostSurfacesSchema = z
  .object({
    schema: z.literal(GHOST_SURFACES_SCHEMA),
    surfaces: z.array(SurfaceSchema).optional().default([]),
  })
  .strict();
