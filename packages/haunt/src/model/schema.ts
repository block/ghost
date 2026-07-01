import { z } from "zod";
import { HauntIdSchema } from "./ids.js";

export const HAUNT_PACKAGE_SCHEMA = "haunt.package/v1" as const;

/** `manifest.yml` — anchors a `.haunt/` package. */
export const HauntPackageManifestSchema = z
  .object({
    schema: z.literal(HAUNT_PACKAGE_SCHEMA),
    id: HauntIdSchema,
  })
  .strict();

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
 * The haunt-side check addition: `references` binds a `ghost.check/v1` check
 * to the prose it enforces — local inventory ids and/or fingerprint node
 * targets (see `classifyReference`). Required, min 1: a haunt check with
 * nothing to reference has no reason to live in `.haunt/`. The rest of the
 * check frontmatter (`name`, `description`, `severity`, …) is ghost-core's
 * contract, linted by `lintGhostCheck`.
 */
export const HauntCheckReferencesSchema = z
  .array(z.string().min(1), {
    message: "references must be an array of non-empty strings",
  })
  .min(1, {
    message:
      "a check must declare at least one reference (a local inventory id or a fingerprint node target)",
  });
