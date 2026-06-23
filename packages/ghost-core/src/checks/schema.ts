import { z } from "zod";
import { GHOST_VALIDATE_SCHEMA } from "./types.js";

const GhostCheckStatusSchema = z.enum(["active", "proposed", "disabled"]);
const GhostCheckSeveritySchema = z.enum(["critical", "serious", "nit"]);

const GhostCheckDerivationIntentRefSchema = z
  .string()
  .min(1)
  .regex(
    /^(intent\.principle|intent\.situation|intent\.experience_contract):[a-z0-9][a-z0-9._-]*$/,
    {
      message:
        "intent derivation refs must use intent.<kind>:slug, e.g. intent.principle:dense-workflows",
    },
  );

const GhostCheckDerivationInventoryRefSchema = z
  .string()
  .min(1)
  .regex(/^inventory\.exemplar:[a-z0-9][a-z0-9._-]*$/, {
    message: "inventory derivation refs must use inventory.exemplar:slug",
  });

const GhostCheckDerivationCompositionRefSchema = z
  .string()
  .min(1)
  .regex(/^composition\.pattern:[a-z0-9][a-z0-9._-]*$/, {
    message: "composition derivation refs must use composition.pattern:slug",
  });

export const GhostCheckDerivationSchema = z
  .object({
    intent: z.array(GhostCheckDerivationIntentRefSchema).optional(),
    inventory: z.array(GhostCheckDerivationInventoryRefSchema).optional(),
    composition: z.array(GhostCheckDerivationCompositionRefSchema).optional(),
  })
  .strict();

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
    derivation: GhostCheckDerivationSchema.optional(),
    applies_to: GhostCheckAppliesToSchema.optional(),
    detector: GhostCheckDetectorSchema,
    evidence: GhostCheckEvidenceSchema.optional(),
    repair: z.string().min(1).optional(),
  })
  .strict();

export const GhostValidateSchema = z
  .object({
    schema: z.literal(GHOST_VALIDATE_SCHEMA),
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
