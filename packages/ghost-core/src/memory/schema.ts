import { z } from "zod";
import { GHOST_DECISION_SCHEMA, GHOST_PROPOSAL_SCHEMA } from "./types.js";

const SlugIdSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9][a-z0-9._-]*$/, {
    message:
      "id must be a slug (lowercase alphanumeric plus . _ -, leading alphanumeric)",
  });

const NonEmptyStringArraySchema = z.array(z.string().min(1)).min(1);

export const GhostExperienceScopeSchema = z
  .object({
    roles: NonEmptyStringArraySchema.optional(),
    scopes: NonEmptyStringArraySchema.optional(),
    surface_types: NonEmptyStringArraySchema.optional(),
    pattern_ids: NonEmptyStringArraySchema.optional(),
    paths: NonEmptyStringArraySchema.optional(),
  })
  .strict();

export const GhostExperienceEvidenceSchema = z
  .object({
    path: z.string().min(1).optional(),
    survey_surface_id: z.string().min(1).optional(),
    locator: z.string().min(1).optional(),
    note: z.string().min(1).optional(),
  })
  .strict()
  .refine(
    (evidence) =>
      Boolean(
        evidence.path ||
          evidence.survey_surface_id ||
          evidence.locator ||
          evidence.note,
      ),
    {
      message:
        "evidence must include at least one of path, survey_surface_id, locator, or note",
    },
  );

export const GhostDecisionSchema = z
  .object({
    schema: z.literal(GHOST_DECISION_SCHEMA),
    id: SlugIdSchema,
    status: z.enum(["accepted", "rejected", "superseded"]),
    title: z.string().min(1),
    claim: z.string().min(1),
    rationale: z.string().min(1),
    scope: GhostExperienceScopeSchema.optional(),
    evidence: z.array(GhostExperienceEvidenceSchema).min(1),
    decided_at: z.string().datetime({ offset: true }),
  })
  .strict();

export const GhostProposalActionSchema = z
  .object({
    target: z.enum(["decisions", "patterns", "checks", "intent"]),
    summary: z.string().min(1),
  })
  .strict();

export const GhostProposalSchema = z
  .object({
    schema: z.literal(GHOST_PROPOSAL_SCHEMA),
    id: SlugIdSchema,
    status: z.enum(["open", "accepted", "rejected", "superseded"]),
    kind: z.enum(["decision", "pattern", "check", "intent"]),
    title: z.string().min(1),
    claim: z.string().min(1),
    rationale: z.string().min(1),
    scope: GhostExperienceScopeSchema.optional(),
    evidence: z.array(GhostExperienceEvidenceSchema).min(1),
    proposed_action: GhostProposalActionSchema,
  })
  .strict();
