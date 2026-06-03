import { z } from "zod";
import { GHOST_FINGERPRINT_SCHEMA } from "./types.js";

const SlugIdSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9][a-z0-9._-]*$/, {
    message:
      "id must be a slug (lowercase alphanumeric plus . _ -, leading alphanumeric)",
  });

export const GhostFingerprintPatternKindSchema = z.enum([
  "visual",
  "behavioral",
  "content",
  "composition",
]);

export const GhostFingerprintRefPrefixSchema = z.enum([
  "principle",
  "situation",
  "experience_contract",
  "pattern",
  "check",
]);

export const GhostFingerprintRefSchema = z
  .string()
  .min(1)
  .regex(
    /^(principle|situation|experience_contract|pattern|check):[a-z0-9][a-z0-9._-]*$/,
    {
      message:
        "ref must be typed as prefix:slug, e.g. principle:dense-workflows",
    },
  );

export const GhostFingerprintMemoryRefSchema = z
  .string()
  .min(1)
  .regex(
    /^(principle|situation|experience_contract|pattern):[a-z0-9][a-z0-9._-]*$/,
    {
      message:
        "ref must be typed as prefix:slug, e.g. principle:dense-workflows",
    },
  );

export const GhostFingerprintEvidenceSchema = z
  .object({
    path: z.string().min(1).optional(),
    locator: z.string().min(1).optional(),
    note: z.string().min(1).optional(),
  })
  .strict();

export const GhostFingerprintScopeSchema = z
  .object({
    scopes: z.array(SlugIdSchema).optional(),
    paths: z.array(z.string().min(1)).optional(),
    surface_types: z.array(SlugIdSchema).optional(),
    situations: z.array(SlugIdSchema).optional(),
  })
  .strict();

export const GhostFingerprintSummarySchema = z
  .object({
    product: z.string().min(1).optional(),
    audience: z.array(z.string().min(1)).optional(),
    goals: z.array(z.string().min(1)).optional(),
    anti_goals: z.array(z.string().min(1)).optional(),
    tradeoffs: z.array(z.string().min(1)).optional(),
    tone: z.array(z.string().min(1)).optional(),
  })
  .strict();

export const GhostFingerprintTopologyScopeSchema = z
  .object({
    id: SlugIdSchema,
    paths: z.array(z.string().min(1)).min(1),
    surface_types: z.array(SlugIdSchema).optional(),
  })
  .strict();

export const GhostFingerprintTopologySchema = z
  .object({
    scopes: z.array(GhostFingerprintTopologyScopeSchema).optional(),
    surface_types: z.array(SlugIdSchema).optional(),
  })
  .strict();

export const GhostFingerprintExemplarSchema = z
  .object({
    id: SlugIdSchema,
    path: z.string().min(1),
    title: z.string().min(1).optional(),
    surface_type: SlugIdSchema.optional(),
    scope: SlugIdSchema.optional(),
    note: z.string().min(1).optional(),
    why: z.string().min(1).optional(),
    refs: z.array(GhostFingerprintMemoryRefSchema).optional(),
  })
  .strict();

export const GhostFingerprintSituationSchema = z
  .object({
    id: SlugIdSchema,
    title: z.string().min(1).optional(),
    user_intent: z.string().min(1).optional(),
    product_obligation: z.string().min(1).optional(),
    surface_type: SlugIdSchema.optional(),
    hierarchy: z.record(z.string(), z.string().min(1)).optional(),
    refuses: z.array(z.string().min(1)).optional(),
    principles: z.array(GhostFingerprintRefSchema).optional(),
    experience_contracts: z.array(GhostFingerprintRefSchema).optional(),
    patterns: z.array(GhostFingerprintRefSchema).optional(),
    evidence: z.array(GhostFingerprintEvidenceSchema).optional(),
  })
  .strict();

export const GhostFingerprintPrincipleSchema = z
  .object({
    id: SlugIdSchema,
    principle: z.string().min(1),
    applies_to: GhostFingerprintScopeSchema.optional(),
    guidance: z.array(z.string().min(1)).optional(),
    evidence: z.array(GhostFingerprintEvidenceSchema).optional(),
    counterexamples: z.array(z.string().min(1)).optional(),
    check_refs: z.array(GhostFingerprintRefSchema).optional(),
  })
  .strict();

export const GhostFingerprintExperienceContractSchema = z
  .object({
    id: SlugIdSchema,
    contract: z.string().min(1),
    applies_to: GhostFingerprintScopeSchema.optional(),
    obligations: z.array(z.string().min(1)).optional(),
    evidence: z.array(GhostFingerprintEvidenceSchema).optional(),
    check_refs: z.array(GhostFingerprintRefSchema).optional(),
  })
  .strict();

export const GhostFingerprintPatternSchema = z
  .object({
    id: SlugIdSchema,
    kind: GhostFingerprintPatternKindSchema,
    pattern: z.string().min(1),
    applies_to: GhostFingerprintScopeSchema.optional(),
    guidance: z.array(z.string().min(1)).optional(),
    evidence: z.array(GhostFingerprintEvidenceSchema).optional(),
    anti_patterns: z.array(z.string().min(1)).optional(),
    check_refs: z.array(GhostFingerprintRefSchema).optional(),
  })
  .strict();

export const GhostFingerprintImplementationVocabularySchema = z
  .object({
    tokens: z.array(z.string().min(1)).optional(),
    components: z.array(z.string().min(1)).optional(),
    libraries: z.array(z.string().min(1)).optional(),
    assets: z.array(z.string().min(1)).optional(),
    notes: z.array(z.string().min(1)).optional(),
  })
  .strict();

export const GhostFingerprintSchema = z
  .object({
    schema: z.literal(GHOST_FINGERPRINT_SCHEMA),
    summary: GhostFingerprintSummarySchema.optional().default({}),
    topology: GhostFingerprintTopologySchema.optional().default({}),
    situations: z.array(GhostFingerprintSituationSchema).optional().default([]),
    principles: z.array(GhostFingerprintPrincipleSchema).optional().default([]),
    experience_contracts: z
      .array(GhostFingerprintExperienceContractSchema)
      .optional()
      .default([]),
    patterns: z.array(GhostFingerprintPatternSchema).optional().default([]),
    exemplars: z.array(GhostFingerprintExemplarSchema).optional().default([]),
    implementation_vocabulary:
      GhostFingerprintImplementationVocabularySchema.optional().default({}),
  })
  .strict();
