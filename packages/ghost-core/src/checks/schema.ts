import { z } from "zod";
import { GHOST_CHECKS_SCHEMA } from "./types.js";

const GhostCheckStatusSchema = z.enum(["active", "proposed", "disabled"]);
const GhostCheckSeveritySchema = z.enum(["critical", "serious", "nit"]);

const GhostCheckAppliesToSchema = z
  .object({
    scopes: z.array(z.string().min(1)).optional(),
    paths: z.array(z.string().min(1)).optional(),
    surface_types: z.array(z.string().min(1)).optional(),
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
      line: z.number().int().positive().optional(),
      note: z.string().min(1).optional(),
    })
    .strict(),
]);

const GhostCheckEvidenceSchema = z
  .object({
    support: z.number().min(0).max(1).optional(),
    observed_count: z.number().int().nonnegative().optional(),
    examples: z.array(GhostCheckEvidenceExampleSchema).optional(),
    notes: z.array(z.string().min(1)).optional(),
  })
  .strict();

const GhostCheckRepairHintSourceSchema = z
  .object({
    path: z.string().min(1),
    line: z.number().int().positive().optional(),
  })
  .strict();

const GhostCheckRepairHintSchema = z
  .object({
    kind: z.enum([
      "tailwind-class-replacement",
      "component-pattern-replacement",
    ]),
    replacement: z.string().min(1),
    reason: z.string().min(1),
    inferred_from: z.enum([
      "same-file-class-pattern",
      "sibling-file-pattern",
      "checks-yml",
    ]),
    source: GhostCheckRepairHintSourceSchema,
    sources: z.array(GhostCheckRepairHintSourceSchema).optional(),
    confidence: z.enum(["high", "medium"]),
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
    applies_to: GhostCheckAppliesToSchema.optional(),
    detector: GhostCheckDetectorSchema,
    evidence: GhostCheckEvidenceSchema.optional(),
    repair: z.string().min(1).optional(),
    repair_hints: z.array(GhostCheckRepairHintSchema).optional(),
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
