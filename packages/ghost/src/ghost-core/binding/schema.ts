import { z } from "zod";
import { GHOST_BINDING_SCHEMA } from "./types.js";

/** Flat surface-id slug — same discipline as surfaces.yml (no dotted hierarchy). */
const SurfaceIdSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9][a-z0-9_-]*$/, {
    message:
      "surface id must be a flat slug (lowercase alphanumeric plus _ -, no dots)",
  });

const BindingEntrySchema = z
  .object({
    surface: SurfaceIdSchema,
    paths: z.array(z.string().min(1)).min(1),
  })
  .strict();

/**
 * Zod schema for `.ghost.bind.yml` (`ghost.binding/v1`).
 *
 * Validates each entry in isolation. Cross-referencing surface ids against the
 * contract's `surfaces.yml` happens at resolution time, not schema time, since
 * the schema cannot see the contract from the binding file alone.
 */
export const GhostBindingSchema = z
  .object({
    schema: z.literal(GHOST_BINDING_SCHEMA),
    contract: z.string().min(1),
    bindings: z.array(BindingEntrySchema).min(1),
  })
  .strict();
