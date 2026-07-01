import { z } from "zod";
import { HauntIdSchema, HauntQualifiedRefSchema } from "./ids.js";

export const HAUNT_PACKAGE_SCHEMA = "haunt.package/v1" as const;

/** `manifest.yml` — anchors a `.haunt/` package. */
export const HauntPackageManifestSchema = z
  .object({
    schema: z.literal(HAUNT_PACKAGE_SCHEMA),
    id: HauntIdSchema,
  })
  .strict();

/**
 * tenet frontmatter. A broad, system-wide principle: composition, product
 * stance, principles. Portable prose — no code binding (`paths` lives on
 * inventory, where code actually lives). Free-form descriptive keys pass
 * through.
 */
export const HauntTenetFrontmatterSchema = z
  .object({
    description: z.string().min(1).optional(),
  })
  .passthrough();

/**
 * inventory frontmatter — the code bridge. `paths` are repo globs naming where
 * this material's source lives; the deterministic core matches diff files
 * against them (shallow bridge — it names where materials are, the agent reads
 * the code).
 */
export const HauntInventoryFrontmatterSchema = z
  .object({
    description: z.string().min(1).optional(),
    paths: z.array(z.string().min(1)).optional(),
  })
  .passthrough();

/**
 * surface frontmatter — a feature area (composition tier). Cites tenets
 * (`honors`) and materials (`uses`) by bare id; it does NOT inherit them (Haunt
 * has no cascade — the citation is an explicit edge, see notes/haunt-direction.md).
 */
export const HauntSurfaceFrontmatterSchema = z
  .object({
    description: z.string().min(1).optional(),
    honors: z.array(HauntIdSchema).optional(),
    uses: z.array(HauntIdSchema).optional(),
  })
  .passthrough();

/**
 * check frontmatter — an assertion that grounds *up* into the prose that
 * justifies it. Its kind falls out of what it grounds in: inventory-grounded
 * checks tend mechanical; tenet-grounded checks are agent-judged high-altitude
 * drift (see notes/haunt-direction.md → "Two kinds of check").
 */
export const HAUNT_CHECK_SEVERITIES = ["high", "medium", "low"] as const;

export const HauntCheckFrontmatterSchema = z
  .object({
    description: z.string().min(1).optional(),
    grounds: z.array(HauntQualifiedRefSchema).min(1, {
      message: "a check must ground in at least one tenet/surface/inventory",
    }),
    severity: z.enum(HAUNT_CHECK_SEVERITIES).optional(),
  })
  .passthrough();
