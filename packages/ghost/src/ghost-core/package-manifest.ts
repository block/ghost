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

const NodeIdSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9][a-z0-9./_-]*$/, "cover must be a node id");

/** `manifest.yml` — anchors a `.ghost/` package. */
export const GhostFingerprintPackageManifestSchema = z
  .object({
    schema: z.literal(GHOST_FINGERPRINT_PACKAGE_SCHEMA),
    id: SlugIdSchema,
    /**
     * Optional id of the cover node: the one node gather inlines above the menu
     * on every invocation. Guaranteed presence for content selection cannot
     * retrieve — essence, temperature, brand-level refusals.
     */
    cover: NodeIdSchema.optional(),
  })
  .strict();

export interface GhostFingerprintPackageManifest {
  schema: typeof GHOST_FINGERPRINT_PACKAGE_SCHEMA;
  id: string;
  /**
   * Optional id of the cover node: the one node gather inlines above the menu on
   * every invocation. Guaranteed presence for content selection cannot retrieve
   * — essence, temperature, brand-level refusals.
   */
  cover?: string;
}
