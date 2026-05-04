import { z } from "zod";

/**
 * Zod schemas for `ghost.survey/v2`.
 *
 * The `kind` field on value rows is intentionally open (a plain string).
 * The validator does not reject unknown kinds — instead the lint step
 * surfaces them as warnings so downstream tooling can canonicalize without
 * blocking new scanners that emit experimental kinds.
 */

const SurveySourceSchema = z.object({
  id: z.string().min(1).optional(),
  role: z.enum(["primary", "resolver"]).optional(),
  target: z.string().min(1),
  commit: z.string().optional(),
  scanned_at: z.string().min(1),
  scanner_version: z.string().optional(),
  resolves: z.array(z.string().min(1)).optional(),
});

const ResolutionSchema = z.object({
  status: z.enum(["resolved", "unresolved-external", "unresolved-local"]),
  source_id: z.string().min(1).optional(),
  target: z.string().min(1).optional(),
  symbol: z.string().min(1).optional(),
  chain: z.array(z.string().min(1)).optional(),
  message: z.string().min(1).optional(),
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
  source: SurveySourceSchema,
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
  resolution: ResolutionSchema.optional(),
});

const TokenRowSchema = RowBaseSchema.extend({
  name: z.string().min(1),
  alias_chain: z.array(z.string()),
  resolved_value: z.string().min(1),
  by_theme: z.record(z.string(), z.string()).optional(),
  occurrences: z.number().int().nonnegative(),
  resolution: ResolutionSchema.optional(),
});

const ComponentRowSchema = RowBaseSchema.extend({
  name: z.string().min(1),
  discovered_via: z.string().min(1),
  variants: z.array(z.string()).optional(),
  sizes: z.array(z.string()).optional(),
});

const UiSurfaceKindSchema = z.enum([
  "route",
  "story",
  "screen",
  "fixture",
  "doc-example",
  "screenshot",
  "source",
]);

const UiSurfaceRenderabilitySchema = z.enum([
  "rendered",
  "screenshot",
  "source-only",
  "unknown",
]);

const UiSurfaceClassificationSchema = z
  .object({
    intent: z.string().min(1).optional(),
    surface_type: z.string().min(1).optional(),
    density: z
      .enum(["compressed", "standard", "breathing", "unknown"])
      .optional(),
    layout_shape: z
      .enum([
        "article",
        "tracker",
        "comparison",
        "card",
        "control-surface",
        "flow",
        "navigation",
        "unknown",
      ])
      .optional(),
    confidence: z.number().min(0).max(1).optional(),
  })
  .strict();

const UiSurfaceSignalsSchema = z
  .object({
    dominant_components: z.array(z.string().min(1)).optional(),
    layout_patterns: z.array(z.string().min(1)).optional(),
    breakpoint_behavior: z.array(z.string().min(1)).optional(),
    value_refs: z.array(z.string().min(1)).optional(),
    notes: z.array(z.string().min(1)).optional(),
  })
  .strict();

const UiSurfaceRowSchema = RowBaseSchema.extend({
  name: z.string().min(1),
  kind: UiSurfaceKindSchema,
  locator: z.string().min(1),
  renderability: UiSurfaceRenderabilitySchema,
  files: z.array(z.string().min(1)),
  classification: UiSurfaceClassificationSchema.optional(),
  signals: UiSurfaceSignalsSchema,
});

export const SurveySchema = z.object({
  schema: z.literal("ghost.survey/v2"),
  sources: z.array(SurveySourceSchema).min(1),
  values: z.array(ValueRowSchema),
  tokens: z.array(TokenRowSchema),
  components: z.array(ComponentRowSchema),
  ui_surfaces: z.array(UiSurfaceRowSchema),
});

export {
  ColorSpecSchema,
  ComponentRowSchema,
  ResolutionSchema,
  SurveySourceSchema,
  TokenRowSchema,
  UiSurfaceClassificationSchema,
  UiSurfaceKindSchema,
  UiSurfaceRenderabilitySchema,
  UiSurfaceRowSchema,
  UiSurfaceSignalsSchema,
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
