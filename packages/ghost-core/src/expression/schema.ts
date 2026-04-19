import { z } from "zod";

/**
 * Current schema version. Bumped when the frontmatter contract changes
 * in a way existing files can't be read. Reader rejects unknown versions.
 *
 * v3: narrative prose (Character, Signature, decision rationale, Values)
 *     moved out of frontmatter into the markdown body. Frontmatter now
 *     carries only machine-facts (dimension slugs, evidence, tokens,
 *     personality/closestSystems tags). Body owns prose outright — no
 *     duplication, no precedence rule.
 *
 * v4: embedding extracted into a sibling `embedding.md` fragment; root
 *     frontmatter no longer carries the 49-dim vector. A loose `metadata`
 *     bag is added so the LLM can append novel observations without a
 *     schema bump. Body links to fragment files via ordinary markdown
 *     links (`[label](path.md)`) — the same progressive-disclosure model
 *     agent skills use.
 */
export const EXPRESSION_SCHEMA_VERSION = 4;

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

/**
 * Frontmatter observation: short machine-tags only. The Character paragraph
 * (summary) and Signature bullets (distinctiveTraits) live in the body.
 */
const DesignObservationSchema = z
  .object({
    personality: z.array(z.string()).optional(),
    closestSystems: z.array(z.string()).optional(),
  })
  .strict();

/**
 * Frontmatter decision: dimension slug + evidence + optional embedding.
 * The prose rationale lives in the body under `### dimension`.
 */
const DesignDecisionSchema = z
  .object({
    dimension: z.string(),
    evidence: z.array(z.string()),
    embedding: z.array(z.number()).optional(),
  })
  .strict();

/**
 * Semantic slot → token binding. Each role names a slot ("h1", "card",
 * "button") and binds tokens from the fingerprint dimensions. Every
 * sub-block is optional — a role can be partial when the source only
 * supplies some tokens.
 */
const DesignRoleSchema = z
  .object({
    name: z.string(),
    tokens: z
      .object({
        typography: z
          .object({
            family: z.string().optional(),
            size: z.number().optional(),
            weight: z.number().optional(),
            lineHeight: z.number().optional(),
          })
          .strict()
          .optional(),
        spacing: z
          .object({
            padding: z.number().optional(),
            gap: z.number().optional(),
            margin: z.number().optional(),
          })
          .strict()
          .optional(),
        surfaces: z
          .object({
            borderRadius: z.number().optional(),
            shadow: z.enum(["none", "subtle", "layered"]).optional(),
            borderWidth: z.number().optional(),
          })
          .strict()
          .optional(),
        palette: z
          .object({
            background: z.string().optional(),
            foreground: z.string().optional(),
            border: z.string().optional(),
          })
          .strict()
          .optional(),
      })
      .strict(),
    evidence: z.array(z.string()),
  })
  .strict();

/**
 * Schema for the YAML frontmatter in an expression.md file. Covers the
 * machine-layer of Expression plus expression-level metadata.
 *
 * Note: narrative prose fields (observation.summary, distinctiveTraits,
 * decisions[].decision, values) are NOT allowed here — they belong in
 * the body. `.strict()` on nested schemas enforces this.
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
    schema: z.number().optional(),
    generator: z.string().optional(),
    generated: z.string().optional(),
    confidence: z.number().optional(),
    /** Relative path to a parent expression.md to inherit from. */
    extends: z.string().optional(),
    /** Loose passthrough bag for LLM-authored extensions. Opaque to readers. */
    metadata: z.record(z.string(), z.unknown()).optional(),

    // fingerprint — required
    id: z.string(),
    source: z.enum(["registry", "extraction", "llm", "unknown"]),
    timestamp: z.string(),
    sources: z.array(z.string()).optional(),

    // fingerprint — narrative tags (optional; prose lives in body)
    observation: DesignObservationSchema.optional(),
    decisions: z.array(DesignDecisionSchema).optional(),

    // fingerprint — structured (required)
    palette: PaletteSchema,
    spacing: SpacingSchema,
    typography: TypographySchema,
    surfaces: SurfacesSchema,

    /**
     * Semantic slot → token bindings. Optional. The bridge from abstract
     * tokens to rendering: each role names a slot and binds tokens from
     * the dimensions above.
     */
    roles: z.array(DesignRoleSchema).optional(),

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
 * fingerprint field they're inheriting from the parent. The merged result
 * is re-validated against the strict FrontmatterSchema.
 */
export const PartialFrontmatterSchema = z
  .object({
    name: z.string().optional(),
    slug: z.string().optional(),
    schema: z.number().optional(),
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
    roles: z.array(DesignRoleSchema).optional(),
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
