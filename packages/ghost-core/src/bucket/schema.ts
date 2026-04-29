import { z } from "zod";

/**
 * Zod schemas for `ghost.bucket/v1`.
 *
 * The `kind` field on value rows is intentionally open (a plain string).
 * The validator does not reject unknown kinds — instead the lint step
 * surfaces them as warnings so downstream tooling can canonicalize without
 * blocking new scanners that emit experimental kinds.
 */

const BucketSourceSchema = z.object({
  target: z.string().min(1),
  commit: z.string().optional(),
  scanned_at: z.string().min(1),
  scanner_version: z.string().optional(),
});

const ScalarUnitSchema = z.object({
  scalar: z.number(),
  unit: z.string().min(1),
});

const ColorSpecSchema = z.object({
  space: z.enum(["srgb", "p3", "rec2020", "lab", "oklch", "unknown"]),
  hex: z.string().optional(),
  rgb: z
    .object({
      r: z.number(),
      g: z.number(),
      b: z.number(),
      a: z.number().optional(),
    })
    .optional(),
  hsl: z
    .object({
      h: z.number(),
      s: z.number(),
      l: z.number(),
      a: z.number().optional(),
    })
    .optional(),
});

const TypographySpecSchema = z.object({
  family: z.string().optional(),
  weight: z.union([z.string(), z.number()]).optional(),
  size: ScalarUnitSchema.optional(),
  line_height: z.union([ScalarUnitSchema, z.string()]).optional(),
  letter_spacing: ScalarUnitSchema.optional(),
});

const ShadowSpecSchema = z.object({
  offset_x: ScalarUnitSchema.optional(),
  offset_y: ScalarUnitSchema.optional(),
  blur: ScalarUnitSchema.optional(),
  spread: ScalarUnitSchema.optional(),
  color: z.string().optional(),
  inset: z.boolean().optional(),
});

const MotionSpecSchema = z.object({
  duration_ms: z.number().optional(),
  easing: z.string().optional(),
});

const LayoutPrimitiveSpecSchema = z.object({
  kind: z.string().min(1),
  scalar: z.number().optional(),
  unit: z.string().optional(),
  raw: z.string().optional(),
});

const BreakpointSpecSchema = ScalarUnitSchema.extend({
  label: z.string().optional(),
});

/**
 * Spec is open: any of the recommended specs, OR a generic record for
 * unknown kinds. We don't bind kind→spec strictly here — the lint step
 * surfaces mismatches as warnings so experimental scanners can iterate
 * without schema changes.
 */
const ValueSpecSchema = z.union([
  ColorSpecSchema,
  TypographySpecSchema,
  ShadowSpecSchema,
  MotionSpecSchema,
  LayoutPrimitiveSpecSchema,
  BreakpointSpecSchema,
  ScalarUnitSchema,
  z.record(z.string(), z.unknown()),
]);

const RowBaseSchema = z.object({
  id: z.string().min(1),
  source: BucketSourceSchema,
});

const ValueRowSchema = RowBaseSchema.extend({
  kind: z.string().min(1),
  value: z.string().min(1),
  raw: z.string(),
  spec: ValueSpecSchema.optional(),
  occurrences: z.number().int().nonnegative(),
  files_count: z.number().int().nonnegative(),
  usage: z.record(z.string(), z.number().int().nonnegative()).optional(),
  role_hypothesis: z.string().optional(),
});

const TokenRowSchema = RowBaseSchema.extend({
  name: z.string().min(1),
  alias_chain: z.array(z.string()),
  resolved_value: z.string().min(1),
  by_theme: z.record(z.string(), z.string()).optional(),
  occurrences: z.number().int().nonnegative(),
});

const ComponentRowSchema = RowBaseSchema.extend({
  name: z.string().min(1),
  discovered_via: z.string().min(1),
  variants: z.array(z.string()).optional(),
  sizes: z.array(z.string()).optional(),
});

const LibraryRowSchema = RowBaseSchema.extend({
  name: z.string().min(1),
  kind: z.string().min(1),
  version: z.string().optional(),
});

export const BucketSchema = z.object({
  schema: z.literal("ghost.bucket/v1"),
  sources: z.array(BucketSourceSchema).min(1),
  values: z.array(ValueRowSchema),
  tokens: z.array(TokenRowSchema),
  components: z.array(ComponentRowSchema),
  libraries: z.array(LibraryRowSchema),
});

export {
  BucketSourceSchema,
  ColorSpecSchema,
  ComponentRowSchema,
  LibraryRowSchema,
  TokenRowSchema,
  ValueRowSchema,
  ValueSpecSchema,
};

/**
 * Recommended value kinds. Used only by the lint step to surface unknown
 * kinds as warnings — the schema accepts any string for `kind`.
 */
export const RECOMMENDED_VALUE_KINDS: readonly string[] = [
  "color",
  "spacing",
  "typography",
  "radius",
  "shadow",
  "breakpoint",
  "motion",
  "layout-primitive",
];
