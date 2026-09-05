import { z } from "zod";

/** Schema emitted for newly initialized `.ghost/` packages. */
export const GHOST_PACKAGE_SCHEMA = "ghost.package/v1" as const;

const SlugIdSchema = z
  .string()
  .min(1)
  .regex(
    /^[a-z0-9][a-z0-9._-]*$/,
    "id must be a lowercase slug (a-z, 0-9, '.', '_', '-')",
  );

const NodeIdSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9][a-z0-9./_-]*$/, "cover must be a node id");

/** `manifest.yml` schema for a `.ghost/` package. */
export const GhostPackageManifestSchema = z
  .object({
    schema: z.literal(GHOST_PACKAGE_SCHEMA),
    id: SlugIdSchema,
    /**
     * Optional id of the cover node: the one node gather inlines above the menu
     * on every invocation. Guaranteed presence for content selection cannot
     * retrieve: essence, temperature, and brand-level refusals.
     */
    cover: NodeIdSchema.optional(),
  })
  .strict();

export type GhostPackageManifest = z.infer<typeof GhostPackageManifestSchema>;
