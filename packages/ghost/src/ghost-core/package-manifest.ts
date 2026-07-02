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
 * Reserved plugin subtree names a fingerprint manifest may declare via
 * `plugins:`. Currently the only known plugin is Haunt (`haunt/`).
 */
export const KNOWN_FINGERPRINT_PLUGINS = ["haunt"] as const;

/** `manifest.yml` — anchors a `.ghost/` package. */
export const GhostFingerprintPackageManifestSchema = z
  .object({
    schema: z.literal(GHOST_FINGERPRINT_PACKAGE_SCHEMA),
    id: SlugIdSchema,
    /**
     * Optional declaration of the reserved plugin subtrees this package uses
     * (e.g. `haunt`). Declaration is hygiene, not gating: reserved subtrees
     * stay reserved unconditionally; `ghost validate` warns on mismatches.
     */
    plugins: z.array(z.string().min(1)).optional(),
  })
  .strict();

export interface GhostFingerprintPackageManifest {
  schema: typeof GHOST_FINGERPRINT_PACKAGE_SCHEMA;
  id: string;
  plugins?: string[];
}
