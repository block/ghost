import { z } from "zod";
import { GHOST_PATTERNS_SCHEMA } from "./types.js";

const SlugIdSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9][a-z0-9._-]*$/, {
    message:
      "id must be a slug (lowercase alphanumeric plus . _ -, leading alphanumeric)",
  });

export const GhostPatternEvidenceSchema = z
  .object({
    surface_id: z.string().min(1).optional(),
    path: z.string().min(1).optional(),
    locator: z.string().min(1).optional(),
    note: z.string().min(1).optional(),
  })
  .strict();

export const GhostSurfaceTypePatternSchema = z
  .object({
    id: SlugIdSchema,
    title: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    signals: z.array(z.string().min(1)).optional(),
    preferred_patterns: z.array(SlugIdSchema).optional(),
    discouraged_patterns: z.array(SlugIdSchema).optional(),
    evidence: z.array(GhostPatternEvidenceSchema).optional(),
  })
  .strict();

export const GhostCompositionAnatomySchema = z
  .object({
    ordered: z.array(z.string().min(1)).optional(),
    required: z.array(z.string().min(1)).optional(),
    optional: z.array(z.string().min(1)).optional(),
    forbidden: z.array(z.string().min(1)).optional(),
  })
  .strict();

export const GhostCompositionPatternSchema = z
  .object({
    id: SlugIdSchema,
    title: z.string().min(1).optional(),
    intent: z.string().min(1).optional(),
    surface_types: z.array(SlugIdSchema).optional(),
    frequency: z.number().int().nonnegative().optional(),
    confidence: z.number().min(0).max(1).optional(),
    anatomy: GhostCompositionAnatomySchema.optional(),
    traits: z
      .record(z.string(), z.union([z.string(), z.array(z.string())]))
      .optional(),
    variants: z.array(z.string().min(1)).optional(),
    anti_patterns: z.array(z.string().min(1)).optional(),
    evidence: z.array(GhostPatternEvidenceSchema).optional(),
    advisory: z.array(z.string().min(1)).optional(),
  })
  .strict();

export const GhostPatternsSchema = z
  .object({
    schema: z.literal(GHOST_PATTERNS_SCHEMA),
    id: SlugIdSchema,
    surface_types: z.array(GhostSurfaceTypePatternSchema),
    composition_patterns: z.array(GhostCompositionPatternSchema),
    advisory: z
      .object({
        review_expectations: z.array(z.string().min(1)).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();
