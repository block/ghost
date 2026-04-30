import { z } from "zod";

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
  /**
   * Shadow vocabulary expressed as an explicit choice, not an absence.
   * `deliberate-none` means "this design language deliberately ships no
   * shadows" (Material 3 with elevated surface tints, brutalist UIs);
   * `subtle` is a single-tier shadow scale; `layered` is multi-tier.
   *
   * Phase 4b renamed the prior `none` value to `deliberate-none` so the
   * choice reads as a positive design stance rather than as "we forgot."
   */
  shadowComplexity: z.enum(["deliberate-none", "subtle", "layered"]),
  borderUsage: z.enum(["minimal", "moderate", "heavy"]),
  borderTokenCount: z.number().optional(),
});

/**
 * Frontmatter observation: short machine-tags only. The Character paragraph
 * (summary) and Signature bullets (distinctiveTraits) live in the body.
 */
const DesignObservationSchema = z
  .object({
    personality: z.array(z.string()).optional(),
    resembles: z.array(z.string()).optional(),
  })
  .strict();

/**
 * Frontmatter decision: dimension slug + optional embedding only.
 * Both the prose rationale AND the evidence bullets live in the body
 * under `### dimension` → `**Evidence:**`. Evidence in frontmatter is
 * rejected by the strict schema.
 */
const DesignDecisionSchema = z
  .object({
    dimension: z.string(),
    embedding: z.array(z.number()).optional(),
  })
  .strict();

/**
 * Schema for the YAML frontmatter in an expression.md file. Covers the
 * machine-layer of Expression plus expression-level metadata.
 *
 * Note: narrative prose fields (observation.summary, distinctiveTraits,
 * decisions[].decision) are NOT allowed here — they belong in the body.
 * `.strict()` on nested schemas enforces this.
 *
 * v4 changes:
 *   - `embedding` is optional at root; when absent, readers load it from
 *     a sibling `embedding.md` fragment or recompute from structured blocks.
 *   - `metadata` is a loose key-value bag for LLM-authored extensions
 *     (e.g. `tone: "magazine"`) that don't fit the strict structural
 *     blocks. Opaque to comparisons.
 */
export const FrontmatterSchema = z
  .object({
    // meta
    name: z.string().optional(),
    slug: z.string().optional(),
    generator: z.string().optional(),
    generated: z.string().optional(),
    confidence: z.number().optional(),
    /** Relative path to a base expression.md to inherit from. */
    extends: z.string().optional(),
    /** Loose passthrough bag for LLM-authored extensions. Opaque to readers. */
    metadata: z.record(z.string(), z.unknown()).optional(),

    // expression — required
    id: z.string(),
    source: z.enum(["registry", "extraction", "llm", "unknown"]),
    timestamp: z.string(),
    sources: z.array(z.string()).optional(),

    // expression — narrative tags (optional; prose lives in body)
    observation: DesignObservationSchema.optional(),
    decisions: z.array(DesignDecisionSchema).optional(),

    // expression — structured (required)
    palette: PaletteSchema,
    spacing: SpacingSchema,
    typography: TypographySchema,
    surfaces: SurfacesSchema,

    /**
     * Optional at root — loader falls back to sibling `embedding.md` or
     * recomputes from structured blocks. Present embeddings are trusted
     * as cache.
     */
    embedding: z.array(z.number()).optional(),
  })
  .strict();

/**
 * Relaxed schema for files that declare `extends:`. Children may omit any
 * expression field they're inheriting from the base expression. The merged result
 * is re-validated against the strict FrontmatterSchema.
 */
export const PartialFrontmatterSchema = z
  .object({
    name: z.string().optional(),
    slug: z.string().optional(),
    generator: z.string().optional(),
    generated: z.string().optional(),
    confidence: z.number().optional(),
    extends: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),

    id: z.string().optional(),
    source: z.enum(["registry", "extraction", "llm", "unknown"]).optional(),
    timestamp: z.string().optional(),
    sources: z.array(z.string()).optional(),

    observation: DesignObservationSchema.optional(),
    decisions: z.array(DesignDecisionSchema).optional(),

    palette: PaletteSchema.optional(),
    spacing: SpacingSchema.optional(),
    typography: TypographySchema.optional(),
    surfaces: SurfacesSchema.optional(),
    embedding: z.array(z.number()).optional(),
  })
  .strict();

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
