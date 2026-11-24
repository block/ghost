import { z } from "zod";
import { NodeIdSchema } from "./node/schema.js";

/** Schema emitted for newly initialized `.ghost/` packages. */
export const GHOST_PACKAGE_SCHEMA = "ghost.package/v1" as const;

const SlugIdSchema = z
  .string()
  .min(1)
  .regex(
    /^[a-z0-9][a-z0-9._-]*$/,
    "id must be a lowercase slug (a-z, 0-9, '.', '_', '-')",
  );

const LegacyCoverIdSchema = z
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
    cover: LegacyCoverIdSchema.optional(),
    version: z.string().trim().min(1).optional(),
    universal: z.string().trim().min(1).optional(),
    core: z
      .array(
        z.custom<string>((value) => NodeIdSchema.safeParse(value).success, {
          message:
            "core entry must be a node ID with lowercase slug segments joined by '/'",
        }),
      )
      .optional(),
  })
  .strict()
  .superRefine(({ cover, version, universal, core }, ctx) => {
    if (version !== undefined && universal !== undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["universal"],
        message:
          "A universal package cannot depend on another universal package",
      });
    }
    if (
      cover !== undefined &&
      (version !== undefined || universal !== undefined || core !== undefined)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["cover"],
        message:
          "Legacy cover cannot be combined with version, universal, or core",
      });
    }
    if (core && new Set(core).size !== core.length) {
      ctx.addIssue({
        code: "custom",
        path: ["core"],
        message: "Core node IDs must be unique",
      });
    }
  });

export type GhostPackageManifest = z.infer<typeof GhostPackageManifestSchema>;
