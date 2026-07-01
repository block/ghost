import { parseSourceRef } from "@anarchitecture/ghost-fingerprint/core";
import { z } from "zod";

/**
 * A Haunt id is a single flat slug — no path segments, no nesting. Unlike
 * Fingerprint (where ids are directory paths), Haunt dirs are flat:
 * `inventory/modals.md` → id `modals`. The absence of `/` is the mechanical
 * enforcement of "no nesting" (see notes/haunt-direction.md).
 */
const HAUNT_ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;

export const HauntIdSchema = z.string().min(1).regex(HAUNT_ID_PATTERN, {
  message:
    "haunt id must be a single flat lowercase slug (a-z, 0-9, '.', '_', '-') — no '/' (Haunt dirs are flat, not nested)",
});

/**
 * A classified check reference. One pointer grammar system-wide, shared with
 * `ghost.check/v1`'s `source:`:
 *   - a bare flat slug that resolves in local inventory → **local**
 *     (`modals`);
 *   - anything else is **fingerprint-shaped**: a `.ghost/` node path id with
 *     an optional case-insensitive `> Heading` anchor
 *     (`checkout/payment > Confirmation`);
 *   - a string that parses as neither is **malformed**.
 *
 * Local-first: a bare slug checks local inventory before the fingerprint
 * catalog. Collisions are rare; an author who hits one renames. (A path-shaped
 * id with `/` or a `> Heading` anchor can only be a fingerprint target.)
 */
export type HauntReference =
  | { kind: "local"; id: string }
  | { kind: "fingerprint"; nodeId: string; heading?: string }
  | { kind: "malformed"; raw: string };

export function classifyReference(
  raw: string,
  localInventoryIds: ReadonlySet<string>,
): HauntReference {
  if (HauntIdSchema.safeParse(raw).success && localInventoryIds.has(raw)) {
    return { kind: "local", id: raw };
  }
  const parsed = parseSourceRef(raw);
  if (parsed === null) {
    return { kind: "malformed", raw };
  }
  return {
    kind: "fingerprint",
    nodeId: parsed.nodeId,
    ...(parsed.heading !== undefined ? { heading: parsed.heading } : {}),
  };
}
