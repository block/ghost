import { z } from "zod";

/**
 * Current schema version. Bumped when the frontmatter contract changes
 * in a way existing files can't be read. Reader rejects unknown versions.
 */
export const EXPRESSION_SCHEMA_VERSION = 2;

const SemanticColorSchema = z.object({
  role: z.string(),
  value: z.string(),
  oklch: z.tuple([z.number(), z.number(), z.number()]).optional(),
});

const ColorRampSchema = z.object({
  steps: z.array(z.string()),
  count: z.number(),
});

const PaletteSchema = z.object({
  dominant: z.array(SemanticColorSchema),
  neutrals: ColorRampSchema,
  semantic: z.array(SemanticColorSchema),
  saturationProfile: z.enum(["muted", "vibrant", "mixed"]),
  contrast: z.enum(["high", "moderate", "low"]),
});

const SpacingSchema = z.object({
  scale: z.array(z.number()),
  regularity: z.number(),
  baseUnit: z.number().nullable(),
});

const TypographySchema = z.object({
  families: z.array(z.string()),
  sizeRamp: z.array(z.number()),
  weightDistribution: z.record(z.string(), z.number()),
  lineHeightPattern: z.enum(["tight", "normal", "loose"]),
});

const SurfacesSchema = z.object({
  borderRadii: z.array(z.number()),
  shadowComplexity: z.enum(["none", "subtle", "layered"]),
  borderUsage: z.enum(["minimal", "moderate", "heavy"]),
  borderTokenCount: z.number().optional(),
});

const DesignObservationSchema = z.object({
  summary: z.string(),
  personality: z.array(z.string()),
  distinctiveTraits: z.array(z.string()),
  closestSystems: z.array(z.string()),
});

const DesignDecisionSchema = z.object({
  dimension: z.string(),
  decision: z.string(),
  evidence: z.array(z.string()),
  embedding: z.array(z.number()).optional(),
});

const DesignValuesSchema = z.object({
  do: z.array(z.string()),
  dont: z.array(z.string()),
});

/**
 * Schema for the YAML frontmatter in an expression.md file. Covers both
 * the DesignFingerprint payload and the expression-level metadata.
 * Meta fields are optional; fingerprint fields are required.
 */
export const FrontmatterSchema = z.object({
  // meta
  name: z.string().optional(),
  slug: z.string().optional(),
  schema: z.number().optional(),
  generator: z.string().optional(),
  generated: z.string().optional(),
  confidence: z.number().optional(),
  /** Relative path to a parent expression.md to inherit from. */
  extends: z.string().optional(),

  // fingerprint — required
  id: z.string(),
  source: z.enum(["registry", "extraction", "llm", "unknown"]),
  timestamp: z.string(),
  sources: z.array(z.string()).optional(),

  // fingerprint — narrative (optional)
  observation: DesignObservationSchema.optional(),
  decisions: z.array(DesignDecisionSchema).optional(),
  values: DesignValuesSchema.optional(),

  // fingerprint — structured (required)
  palette: PaletteSchema,
  spacing: SpacingSchema,
  typography: TypographySchema,
  surfaces: SurfacesSchema,
  embedding: z.array(z.number()),
});

/**
 * Relaxed schema for files that declare `extends:`. Children may omit any
 * fingerprint field they're inheriting from the parent. The merged result
 * is re-validated against the strict FrontmatterSchema.
 */
export const PartialFrontmatterSchema = z.object({
  name: z.string().optional(),
  slug: z.string().optional(),
  schema: z.number().optional(),
  generator: z.string().optional(),
  generated: z.string().optional(),
  confidence: z.number().optional(),
  extends: z.string().optional(),

  id: z.string().optional(),
  source: z.enum(["registry", "extraction", "llm", "unknown"]).optional(),
  timestamp: z.string().optional(),
  sources: z.array(z.string()).optional(),

  observation: DesignObservationSchema.optional(),
  decisions: z.array(DesignDecisionSchema).optional(),
  values: DesignValuesSchema.optional(),

  palette: PaletteSchema.optional(),
  spacing: SpacingSchema.optional(),
  typography: TypographySchema.optional(),
  surfaces: SurfacesSchema.optional(),
  embedding: z.array(z.number()).optional(),
});

export type FrontmatterShape = z.infer<typeof FrontmatterSchema>;

/**
 * Export the frontmatter schema as a JSON Schema document.
 *
 * Used to (a) publish schemas/expression.schema.json for IDE autocomplete
 * in .md files, and (b) back `ghost expression schema` output.
 */
export function toJsonSchema(): Record<string, unknown> {
  return z.toJSONSchema(FrontmatterSchema) as Record<string, unknown>;
}

/**
 * Parse a frontmatter object with schema validation. Throws a readable
 * error that lists every invalid path and the expected type. Unlike
 * zod's default message, this surfaces the first ~5 issues inline so the
 * user can fix them in one pass.
 */
export function validateFrontmatter(
  raw: unknown,
  options: { partial?: boolean } = {},
): FrontmatterShape {
  const schema = options.partial ? PartialFrontmatterSchema : FrontmatterSchema;
  const result = schema.safeParse(raw);
  if (result.success) return result.data as FrontmatterShape;

  const issues = result.error.issues.slice(0, 5).map((iss) => {
    const path = iss.path.length ? iss.path.join(".") : "(root)";
    return `  • ${path}: ${iss.message}`;
  });
  const more =
    result.error.issues.length > 5
      ? `\n  … and ${result.error.issues.length - 5} more`
      : "";
  throw new Error(
    `Invalid expression frontmatter:\n${issues.join("\n")}${more}`,
  );
}
