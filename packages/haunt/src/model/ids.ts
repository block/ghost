import { z } from "zod";

/**
 * A Haunt id is a single flat slug — no path segments, no nesting. Unlike
 * Fingerprint (where ids are directory paths and encode a cascade), Haunt tiers
 * are flat: `tenets/composition.md` → id `composition`, scoped by its tier. The
 * absence of `/` is the mechanical enforcement of "no nesting" (per the
 * flat-tier scaffolding; direction in notes/haunt-direction.md).
 */
const HAUNT_ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;

export const HauntIdSchema = z.string().min(1).regex(HAUNT_ID_PATTERN, {
  message:
    "haunt id must be a single flat lowercase slug (a-z, 0-9, '.', '_', '-') — no '/' (Haunt tiers are flat, not nested)",
});

/**
 * A cross-tier reference. Edges name their target tier explicitly so the graph
 * is legible without inference:
 *   - `honors` targets are bare tenet ids (`composition`)
 *   - `uses` targets are bare inventory ids (`modals`)
 *   - `grounds` targets are tier-qualified (`tenets/composition`,
 *     `surfaces/checkout`, `inventory/modals`) because a check can ground in any
 *     of the three content tiers.
 */
export const HAUNT_TIERS = ["tenets", "inventory", "surfaces"] as const;
export type HauntTier = (typeof HAUNT_TIERS)[number];

const QUALIFIED_REF_PATTERN =
  /^(tenets|inventory|surfaces)\/[a-z0-9][a-z0-9._-]*$/;

/** A tier-qualified ref like `tenets/composition`, used by `grounds`. */
export const HauntQualifiedRefSchema = z
  .string()
  .min(1)
  .regex(QUALIFIED_REF_PATTERN, {
    message:
      "grounds target must be tier-qualified: 'tenets/<id>', 'inventory/<id>', or 'surfaces/<id>'",
  });

export interface HauntQualifiedRef {
  tier: HauntTier;
  id: string;
}

/** Split `tenets/composition` → { tier: "tenets", id: "composition" }. */
export function parseQualifiedRef(ref: string): HauntQualifiedRef {
  const slash = ref.indexOf("/");
  return {
    tier: ref.slice(0, slash) as HauntTier,
    id: ref.slice(slash + 1),
  };
}
