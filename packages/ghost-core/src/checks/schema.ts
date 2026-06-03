import { z } from "zod";
import { GHOST_CHECKS_SCHEMA } from "./types.js";

const GhostCheckStatusSchema = z.enum(["active", "proposed", "disabled"]);
const GhostCheckSeveritySchema = z.enum(["critical", "serious", "nit"]);

export const GhostCheckDerivesFromSchema = z
  .string()
  .min(1)
  .regex(
    /^(principle|situation|experience_contract|pattern):[a-z0-9][a-z0-9._-]*$/,
    {
      message:
        "derives_from must use a typed fingerprint ref, e.g. principle:dense-workflows",
    },
  );

const GhostCheckAppliesToSchema = z
  .object({
    scopes: z.array(z.string().min(1)).optional(),
    paths: z.array(z.string().min(1)).optional(),
    surface_types: z.array(z.string().min(1)).optional(),
    pattern_ids: z.array(z.string().min(1)).optional(),
  })
  .strict();

const GhostCheckDetectorSchema = z
  .object({
    type: z.enum([
      "forbidden-regex",
      "required-regex",
      "banned-import",
      "banned-component",
      "required-token",
    ]),
    pattern: z.string().min(1).optional(),
    value: z.string().min(1).optional(),
    contexts: z.array(z.string().min(1)).optional(),
  })
  .strict();

const GhostCheckEvidenceExampleSchema = z.union([
  z.string().min(1),
  z
    .object({
      path: z.string().min(1),
      note: z.string().min(1).optional(),
    })
    .strict(),
]);

const GhostCheckEvidenceSchema = z
  .object({
    support: z.number().min(0).max(1).optional(),
    observed_count: z.number().int().nonnegative().optional(),
    examples: z.array(GhostCheckEvidenceExampleSchema).optional(),
  })
  .strict();

export const GhostCheckSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .regex(/^[a-z0-9][a-z0-9._-]*$/, {
        message:
          "id must be a slug (lowercase alphanumeric plus . _ -, leading alphanumeric)",
      }),
    title: z.string().min(1),
    status: GhostCheckStatusSchema,
    severity: GhostCheckSeveritySchema,
    derives_from: GhostCheckDerivesFromSchema.optional(),
    applies_to: GhostCheckAppliesToSchema.optional(),
    detector: GhostCheckDetectorSchema,
    evidence: GhostCheckEvidenceSchema.optional(),
    repair: z.string().min(1).optional(),
  })
  .strict();

export const GhostChecksSchema = z
  .object({
    schema: z.literal(GHOST_CHECKS_SCHEMA),
    id: z
      .string()
      .min(1)
      .regex(/^[a-z0-9][a-z0-9._-]*$/, {
        message:
          "id must be a slug (lowercase alphanumeric plus . _ -, leading alphanumeric)",
      }),
    checks: z.array(GhostCheckSchema),
  })
  .strict();
