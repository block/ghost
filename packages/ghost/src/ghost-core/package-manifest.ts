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

/** `manifest.yml` — anchors a `.ghost/` package. */
export const GhostFingerprintPackageManifestSchema = z
  .object({
    schema: z.literal(GHOST_FINGERPRINT_PACKAGE_SCHEMA),
    id: SlugIdSchema,
  })
  .strict();

export interface GhostFingerprintPackageManifest {
  schema: typeof GHOST_FINGERPRINT_PACKAGE_SCHEMA;
  id: string;
}
