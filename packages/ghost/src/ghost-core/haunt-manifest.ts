import { z } from "zod";

export const GHOST_HAUNT_SCHEMA = "ghost.haunt/v1" as const;

/** Manifest filename anchoring a haunt inside `.ghost/haunts/<id>/`. */
export const GHOST_HAUNT_MANIFEST_FILENAME = "haunt.yml";

const HauntIdSchema = z
  .string()
  .min(1)
  .regex(
    /^[a-z0-9][a-z0-9._-]*$/,
    "id must be a lowercase slug (a-z, 0-9, '.', '_', '-')",
  );

/**
 * `haunt.yml` — anchors one haunt directory. Deliberately thin: a schema
 * version and an id. Config pressure should push toward new haunt ids, not
 * richer manifests.
 */
export const GhostHauntManifestSchema = z
  .object({
    schema: z.literal(GHOST_HAUNT_SCHEMA),
    id: HauntIdSchema,
  })
  .strict();

export interface GhostHauntManifest {
  schema: typeof GHOST_HAUNT_SCHEMA;
  id: string;
}
