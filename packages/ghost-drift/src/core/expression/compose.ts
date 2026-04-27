import type { DesignDecision, Expression } from "@ghost/core";

/**
 * Merge an overlay expression on top of a base expression. Precedence rules:
 *
 *   • Scalars / arrays      → overlay replaces when present, else base
 *   • decisions             → merged by `dimension` slug; overlay wins per-dim,
 *                             base-only decisions are preserved
 *   • palette.dominant/semantic → merged by `role`; overlay wins per-role,
 *                                 base-only roles preserved
 *
 * This mirrors the intent of declaring "this expression is based on that one,
 * with these specific changes" — untouched base decisions remain, while
 * overrides swap in cleanly.
 */
export function mergeExpression(
  base: Expression,
  overlay: Partial<Expression>,
): Expression {
  const merged: Expression = {
    ...base,
    ...stripUndefined(overlay),
  };

  if (base.decisions || overlay.decisions) {
    merged.decisions = mergeByKey(
      base.decisions ?? [],
      overlay.decisions ?? [],
      (d) => d.dimension,
    );
  }

  if (base.roles || overlay.roles) {
    merged.roles = mergeByKey(
      base.roles ?? [],
      overlay.roles ?? [],
      (r) => r.name,
    );
  }

  if (base.palette || overlay.palette) {
    const basePalette = base.palette;
    const overlayPalette = overlay.palette;
    merged.palette = {
      ...(basePalette ?? emptyPalette()),
      ...(overlayPalette ?? {}),
      dominant: mergeByKey(
        basePalette?.dominant ?? [],
        overlayPalette?.dominant ?? [],
        (c) => c.role,
      ),
      semantic: mergeByKey(
        basePalette?.semantic ?? [],
        overlayPalette?.semantic ?? [],
        (c) => c.role,
      ),
      // neutrals / saturationProfile / contrast: overlay replaces if present
      neutrals: overlayPalette?.neutrals ??
        basePalette?.neutrals ?? { steps: [], count: 0 },
      saturationProfile:
        overlayPalette?.saturationProfile ??
        basePalette?.saturationProfile ??
        "muted",
      contrast: overlayPalette?.contrast ?? basePalette?.contrast ?? "moderate",
    };
  }

  return merged;
}

function mergeByKey<T>(base: T[], overlay: T[], key: (item: T) => string): T[] {
  const overlayByKey = new Map(overlay.map((item) => [key(item), item]));
  const out: T[] = [];
  const seen = new Set<string>();

  // Base order first, with overlay overrides slotted in place
  for (const item of base) {
    const k = key(item);
    seen.add(k);
    const override = overlayByKey.get(k);
    out.push(override ?? item);
  }
  // Overlay-only entries appended at the end
  for (const item of overlay) {
    const k = key(item);
    if (!seen.has(k)) out.push(item);
  }
  return out;
}

function stripUndefined<T extends object>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

function emptyPalette(): Expression["palette"] {
  return {
    dominant: [],
    neutrals: { steps: [], count: 0 },
    semantic: [],
    saturationProfile: "muted",
    contrast: "moderate",
  };
}

// Re-export the decision type so callers writing their own merges don't
// need to reach into ../types.
export type { DesignDecision };
