import { z } from "zod";

/**
 * Platform values accepted by `ghost.map/v1`. Real repos may straddle
 * multiple platforms — `platform:` accepts either a single value or an
 * array (see `PlatformValueSchema`). The legacy `mixed` enum value stays
 * for backcompat but the array form is preferred for clarity.
 */
const PlatformEnum = z.enum([
  "web",
  "ios",
  "android",
  "desktop",
  "flutter",
  "mixed",
  "other",
]);

const PlatformValueSchema = z.union([
  PlatformEnum,
  z.array(PlatformEnum).min(1),
]);

/**
 * Build-system values accepted by `ghost.map/v1`. As with `platform`, the
 * field accepts either a single value or an array — real repos run mixes
 * like Yarn + SPM + Gradle + Style Dictionary at once.
 *
 * The enum was extended in Phase 4b to cover token-pipeline tooling
 * (`style-dictionary`) and JVM/native build systems that show up in real
 * monorepos but didn't fit any earlier value (`bazel`, `maven`, `sbt`,
 * `cmake`). `cargo` was already present before 4b.
 *
 * Phase 5b adds JS bundlers and meta-build coordinators: real consumer
 * repos use `vite` as the build with `pnpm`/`yarn` for dependencies, and
 * monorepos increasingly run `nx` or `turbo` on top. Without these the
 * recipe was forced to drop signal into prose; an array like
 * `[pnpm, vite, nx, style-dictionary]` is now expressible.
 */
const BuildSystemEnum = z.enum([
  "gradle",
  "bazel",
  "xcode",
  "pnpm",
  "npm",
  "yarn",
  "cargo",
  "go",
  "maven",
  "sbt",
  "cmake",
  "style-dictionary",
  // JS bundlers
  "vite",
  "webpack",
  "parcel",
  "rollup",
  "turbopack",
  "esbuild",
  // Meta-build coordinators
  "nx",
  "turbo",
  "mixed",
  "other",
]);

const BuildSystemValueSchema = z.union([
  BuildSystemEnum,
  z.array(BuildSystemEnum).min(1),
]);

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
  platform: PlatformValueSchema,
  languages: z
    .array(
      z.object({
        name: z.string().min(1),
        files: z.number().int().nonnegative(),
        share: z.number().min(0).max(1),
      }),
    )
    .min(1),
  build_system: BuildSystemValueSchema,
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
    /**
     * Files that resolve a token end-to-end — the source-of-truth layer.
     * Optional in 4b: a design system may have only derived artifacts
     * checked in (rare but real for upstream-token consumers).
     */
    entry_files: z.array(z.string().min(1)).optional(),
    /**
     * Build artifacts other tools may consume (e.g. `dist/colors.ts`
     * generated from `tokens/colors.json`). Optional. Distinct from
     * `entry_files` so drift can point at the right reference layer.
     */
    derived_files: z.array(z.string().min(1)).optional(),
    /**
     * How the design system sources its tokens.
     *   - `inline`: the system declares its own tokens in-tree
     *   - `external`: tokens are pulled from another package (`upstream`)
     *   - `mixed`: both inline and external token sources coexist
     */
    token_source: z.enum(["inline", "external", "mixed"]).optional(),
    /**
     * Reference(s) to the upstream token source(s) when `token_source` is
     * `external` or `mixed`. Free-form strings: npm package names, SPM
     * module refs, relative paths to sibling packages, etc.
     *
     * Accepts either a single string or an array of strings. Real
     * consumers often pull from multiple upstream packages (a token
     * package + a component package + an icon package + a glue package);
     * the array form keeps the structured signal instead of forcing the
     * recipe to pack them into prose.
     */
    upstream: z
      .union([z.string().min(1), z.array(z.string().min(1)).min(1)])
      .optional(),
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
