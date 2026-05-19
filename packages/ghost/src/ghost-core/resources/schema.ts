import { z } from "zod";
import { GHOST_RESOURCES_SCHEMA } from "./types.js";

const SlugIdSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9][a-z0-9._-]*$/, {
    message:
      "id must be a slug (lowercase alphanumeric plus . _ -, leading alphanumeric)",
  });

export const GhostResourceRefSchema = z
  .object({
    id: SlugIdSchema.optional(),
    target: z.string().min(1),
    kind: z.string().min(1).optional(),
    paths: z.array(z.string().min(1)).optional(),
    note: z.string().min(1).optional(),
  })
  .strict();

export const GhostSurfaceResourceSchema = z
  .object({
    id: SlugIdSchema.optional(),
    name: z.string().min(1).optional(),
    kind: z.string().min(1).optional(),
    target: z.string().min(1).optional(),
    locator: z.string().min(1).optional(),
    paths: z.array(z.string().min(1)).optional(),
    note: z.string().min(1).optional(),
  })
  .strict();

export const GhostResourcesSchema = z
  .object({
    schema: z.literal(GHOST_RESOURCES_SCHEMA),
    id: SlugIdSchema,
    primary: GhostResourceRefSchema,
    design_system: z.array(GhostResourceRefSchema).optional(),
    surfaces: z.array(GhostSurfaceResourceSchema).optional(),
    screenshots: z.array(GhostResourceRefSchema).optional(),
    docs: z.array(GhostResourceRefSchema).optional(),
    resolvers: z.array(GhostResourceRefSchema).optional(),
    upstreams: z.array(GhostResourceRefSchema).optional(),
    include: z.array(z.string().min(1)).optional(),
    exclude: z.array(z.string().min(1)).optional(),
  })
  .strict();
