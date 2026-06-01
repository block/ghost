import { z } from "zod";
import { GHOST_FINGERPRINT_SCHEMA } from "./types.js";

const SlugIdSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9][a-z0-9._-]*$/, {
    message:
      "id must be a slug (lowercase alphanumeric plus . _ -, leading alphanumeric)",
  });

export const GhostFingerprintStatusSchema = z.enum([
  "accepted",
  "proposed",
  "deprecated",
]);

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
  "substrate",
  "check",
]);

export const GhostFingerprintRefSchema = z
  .string()
  .min(1)
  .regex(
    /^(principle|situation|experience_contract|pattern|substrate|check):[a-z0-9][a-z0-9._-]*$/,
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

export const GhostFingerprintTopologyExampleSchema = z
  .object({
    path: z.string().min(1),
    surface_type: SlugIdSchema.optional(),
    note: z.string().min(1).optional(),
  })
  .strict();

export const GhostFingerprintTopologySchema = z
  .object({
    scopes: z.array(GhostFingerprintTopologyScopeSchema).optional(),
    surface_types: z.array(SlugIdSchema).optional(),
    examples: z.array(GhostFingerprintTopologyExampleSchema).optional(),
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
    status: GhostFingerprintStatusSchema,
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
    status: GhostFingerprintStatusSchema,
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
    status: GhostFingerprintStatusSchema,
    kind: GhostFingerprintPatternKindSchema,
    pattern: z.string().min(1),
    applies_to: GhostFingerprintScopeSchema.optional(),
    guidance: z.array(z.string().min(1)).optional(),
    evidence: z.array(GhostFingerprintEvidenceSchema).optional(),
    anti_patterns: z.array(z.string().min(1)).optional(),
    check_refs: z.array(GhostFingerprintRefSchema).optional(),
  })
  .strict();

export const GhostFingerprintSubstrateSchema = z
  .object({
    tokens: z.array(z.string().min(1)).optional(),
    components: z.array(z.string().min(1)).optional(),
    accessibility: z.array(z.string().min(1)).optional(),
    responsive: z.array(z.string().min(1)).optional(),
  })
  .strict();

export const GhostFingerprintReviewPolicySchema = z
  .object({
    proposal_policy: z.array(z.string().min(1)).optional(),
    experience_gap_categories: z.array(z.string().min(1)).optional(),
    memory_gap_policy: z.array(z.string().min(1)).optional(),
  })
  .strict();

export const GhostFingerprintSchema = z
  .object({
    schema: z.literal(GHOST_FINGERPRINT_SCHEMA),
    summary: GhostFingerprintSummarySchema,
    topology: GhostFingerprintTopologySchema,
    situations: z.array(GhostFingerprintSituationSchema),
    principles: z.array(GhostFingerprintPrincipleSchema),
    experience_contracts: z.array(GhostFingerprintExperienceContractSchema),
    patterns: z.array(GhostFingerprintPatternSchema),
    substrate: GhostFingerprintSubstrateSchema,
    review_policy: GhostFingerprintReviewPolicySchema,
  })
  .strict();
