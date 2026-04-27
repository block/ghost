import { z } from "zod";

/**
 * Zod schema for `ghost.fleet/v1` frontmatter.
 *
 * The body sections (World shape / Cohorts / Tracks) are checked separately
 * — this schema only covers the YAML machine layer.
 *
 * Per `docs/ideas/ghost-fleet.md`, clusters are deliberately *not* in the
 * frontmatter. They're a body-narrative projection the skill recipe writes
 * over the pairwise distances + groupings the CLI emits.
 */

const ISO_DATE_OR_DATETIME = z.iso.datetime({ offset: true }).or(
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: "must be ISO date (YYYY-MM-DD) or full datetime",
  }),
);

export const FleetMemberEntrySchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9][a-z0-9._-]*$/, {
      message:
        "id must be a slug (lowercase alphanumeric plus . _ -, leading alphanumeric)",
    }),
  platform: z.string().min(1),
  build_system: z.string().min(1).optional(),
  registry: z.string().min(1).nullable().optional(),
  expression_at: ISO_DATE_OR_DATETIME.optional(),
});

export const FleetDistanceSchema = z.object({
  a: z.string().min(1),
  b: z.string().min(1),
  distance: z.number().min(0),
});

export const FleetTrackEdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
});

export const FleetGroupingsSchema = z.record(
  z.string(),
  z.record(z.string(), z.array(z.string().min(1))),
);

export const FleetFrontmatterSchema = z.object({
  schema: z.literal("ghost.fleet/v1"),
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9][a-z0-9._-]*$/, {
      message:
        "id must be a slug (lowercase alphanumeric plus . _ -, leading alphanumeric)",
    }),
  generated_at: ISO_DATE_OR_DATETIME,
  members: z.array(FleetMemberEntrySchema).min(1),
  distances: z.array(FleetDistanceSchema),
  tracks: z.array(FleetTrackEdgeSchema),
  groupings: FleetGroupingsSchema,
});

export type FleetFrontmatter = z.infer<typeof FleetFrontmatterSchema>;
export type FleetMemberEntry = z.infer<typeof FleetMemberEntrySchema>;
export type FleetDistance = z.infer<typeof FleetDistanceSchema>;
export type FleetTrackEdge = z.infer<typeof FleetTrackEdgeSchema>;
export type FleetGroupings = z.infer<typeof FleetGroupingsSchema>;

/** Required body sections in canonical order. */
export const REQUIRED_BODY_SECTIONS = [
  "World shape",
  "Cohorts",
  "Tracks",
] as const;
export type RequiredBodySection = (typeof REQUIRED_BODY_SECTIONS)[number];

/** Canonical filename for the emitted fleet artifact. */
export const FLEET_FILENAME = "fleet.md";
/** Canonical filename for the JSON sidecar. */
export const FLEET_JSON_FILENAME = "fleet.json";
/** Reports subdirectory under the fleet root where artifacts are written. */
export const FLEET_REPORTS_DIRNAME = "reports";
/** Members subdirectory under the fleet root containing per-member files. */
export const FLEET_MEMBERS_DIRNAME = "members";
