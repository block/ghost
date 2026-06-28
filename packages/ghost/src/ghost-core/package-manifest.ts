import { z } from "zod";

export const GHOST_FINGERPRINT_PACKAGE_SCHEMA =
  "ghost.fingerprint-package/v1" as const;

const SlugIdSchema = z
  .string()
  .min(1)
  .regex(
    /^[a-z0-9][a-z0-9._-]*$/,
    "id must be a lowercase slug (a-z, 0-9, '.', '_', '-')",
  );

/**
 * `extends` maps a package identity (the key, used in `<id>:<node>` refs) to
 * where that package's `.ghost/` lives. The value is the location for now; once
 * discovery lands it becomes optional (omit → resolve by matching manifest id).
 */
const ExtendsSchema = z.record(SlugIdSchema, z.string().min(1));

/** `manifest.yml` — anchors a `.ghost/` package. */
export const GhostFingerprintPackageManifestSchema = z
  .object({
    schema: z.literal(GHOST_FINGERPRINT_PACKAGE_SCHEMA),
    id: SlugIdSchema,
    extends: ExtendsSchema.optional(),
  })
  .strict();

export interface GhostFingerprintPackageManifest {
  schema: typeof GHOST_FINGERPRINT_PACKAGE_SCHEMA;
  id: string;
  extends?: Record<string, string>;
}
