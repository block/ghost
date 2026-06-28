import { z } from "zod";
import { GHOST_SURFACES_SCHEMA } from "./types.js";

/**
 * Flat slug for surface ids. The dot is excluded: a dotted id (`email.marketing`)
 * would pretend to be a `parent` link, creating a second source of truth for the
 * tree. Containment lives only in `parent`.
 */
const SurfaceIdSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9][a-z0-9_-]*$/, {
    message:
      "surface id must be a flat slug (lowercase alphanumeric plus _ -, no dots; the tree lives in parent)",
  });

const SurfaceSchema = z
  .object({
    id: SurfaceIdSchema,
    description: z.string().min(1).optional(),
    parent: SurfaceIdSchema.optional(),
  })
  .strict();

/**
 * Zod schema for `surfaces.yml` (`ghost.surfaces/v1`) — the optional terse spine
 * file. Validates each position in isolation; graph-level rules (parent exists,
 * no cycles) are covered by the node-graph lint after the fold.
 */
export const GhostSurfacesSchema = z
  .object({
    schema: z.literal(GHOST_SURFACES_SCHEMA),
    surfaces: z.array(SurfaceSchema).optional().default([]),
  })
  .strict();
