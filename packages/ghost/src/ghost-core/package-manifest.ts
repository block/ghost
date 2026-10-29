import { z } from "zod";
import { NodeIdSchema as LocalNodeIdSchema } from "./node/schema.js";

/** Schema emitted for newly initialized `.ghost/` packages. */
export const GHOST_PACKAGE_SCHEMA = "ghost.package/v1" as const;

const SlugIdSchema = z
  .string()
  .min(1)
  .regex(
    /^[a-z0-9][a-z0-9._-]*$/,
    "id must be a lowercase slug (a-z, 0-9, '.', '_', '-')",
  );

/** `manifest.yml` schema for a `.ghost/` package. */
const LayeredManifestSchema = z
  .object({
    schema: z.literal(GHOST_PACKAGE_SCHEMA),
    id: SlugIdSchema,
    /** Baseline version the brand was authored against (not a pin). */
    baseline: z.string().optional(),
    /** Effective release version, valid only on baseline packages. */
    version: z.string().optional(),
    /** A small, always-delivered subset of baseline fundamentals. */
    core: z.array(LocalNodeIdSchema).min(1).optional(),
  })
  .strict()
  .superRefine((manifest, ctx) => {
    if (
      manifest.baseline !== undefined &&
      (manifest.core !== undefined || manifest.version !== undefined)
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "baseline is brand-only; core and version are baseline-only and cannot be combined with baseline",
      });
    }
  });

const LegacyManifestSchema = z
  .object({
    schema: z.literal(GHOST_PACKAGE_SCHEMA),
    id: SlugIdSchema,
    cover: LocalNodeIdSchema.optional(),
    plugins: z
      .never({ message: "plugins is a retired manifest key" })
      .optional(),
    baseline: z.never().optional(),
    version: z.never().optional(),
    core: z.never().optional(),
  })
  .passthrough();

/** The manifest chooses the contract before any node is parsed. */
export const GhostPackageManifestSchema = z
  .unknown()
  .transform((value, ctx) => {
    const layered =
      typeof value === "object" &&
      value !== null &&
      ["baseline", "core", "version"].some((key) => key in value);
    const result = (
      layered ? LayeredManifestSchema : LegacyManifestSchema
    ).safeParse(value);
    if (!result.success) {
      for (const issue of result.error.issues) ctx.addIssue({ ...issue });
      return z.NEVER;
    }
    return result.data as z.infer<typeof LayeredManifestSchema> & {
      cover?: string;
      [key: string]: unknown;
    };
  });

export type GhostPackageManifest = z.infer<typeof GhostPackageManifestSchema>;

/** Package roles are declared by the manifest, never inferred from nodes. */
export function isBaselinePackage(manifest: GhostPackageManifest): boolean {
  return manifest.core !== undefined || manifest.version !== undefined;
}
export function isLayeredPackage(manifest: GhostPackageManifest): boolean {
  return manifest.baseline !== undefined || isBaselinePackage(manifest);
}
