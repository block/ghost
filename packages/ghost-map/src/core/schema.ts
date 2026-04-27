import { z } from "zod";

/**
 * Zod schema for `ghost.map/v1` frontmatter.
 *
 * The body section (Identity / Topology / Conventions) is checked separately
 * by the linter — this schema only covers the YAML machine layer.
 */
export const MapFrontmatterSchema = z.object({
  schema: z.literal("ghost.map/v1"),
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9][a-z0-9._-]*$/, {
      message:
        "id must be a slug (lowercase alphanumeric plus . _ -, leading alphanumeric)",
    }),
  repo: z.string().min(1),
  mapped_at: z.iso.datetime({ offset: true }).or(
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
      message: "mapped_at must be ISO date (YYYY-MM-DD) or full datetime",
    }),
  ),
  platform: z.enum([
    "web",
    "ios",
    "android",
    "desktop",
    "flutter",
    "mixed",
    "other",
  ]),
  languages: z
    .array(
      z.object({
        name: z.string().min(1),
        files: z.number().int().nonnegative(),
        share: z.number().min(0).max(1),
      }),
    )
    .min(1),
  build_system: z.enum([
    "gradle",
    "bazel",
    "xcode",
    "pnpm",
    "npm",
    "yarn",
    "cargo",
    "go",
    "mixed",
    "other",
  ]),
  package_manifests: z.array(z.string().min(1)).min(1),
  composition: z.object({
    frameworks: z.array(
      z.object({
        name: z.string().min(1),
        version: z.string().min(1).optional(),
      }),
    ),
    rendering: z.string().min(1),
    styling: z.array(z.string().min(1)).min(1),
    navigation: z.string().min(1).optional(),
  }),
  registry: z
    .object({
      path: z.string().min(1),
      components: z.number().int().nonnegative(),
    })
    .nullable()
    .optional(),
  design_system: z.object({
    paths: z.array(z.string().min(1)),
    entry_files: z.array(z.string().min(1)),
    status: z.enum(["active", "mixed", "unclear"]),
  }),
  ui_surface: z.object({
    include: z.array(z.string().min(1)),
    exclude: z.array(z.string().min(1)),
  }),
  feature_areas: z
    .array(
      z.object({
        name: z.string().min(1),
        paths: z.array(z.string().min(1)).min(1),
        sub_areas: z.array(z.string().min(1)).optional(),
      }),
    )
    .min(1),
  orientation_files: z.array(z.string().min(1)).min(1),
});

export type MapFrontmatter = z.infer<typeof MapFrontmatterSchema>;

/** Required body sections in canonical order. */
export const REQUIRED_BODY_SECTIONS = [
  "Identity",
  "Topology",
  "Conventions",
] as const;
export type RequiredBodySection = (typeof REQUIRED_BODY_SECTIONS)[number];
