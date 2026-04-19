import type { DesignDecision, DesignFingerprint } from "../types.js";

/**
 * Merge a child fingerprint on top of a parent. Precedence rules:
 *
 *   • Scalars / arrays      → child replaces when present, else parent
 *   • decisions             → merged by `dimension` slug; child wins per-dim,
 *                             parent-only decisions are preserved
 *   • palette.dominant/semantic → merged by `role`; child wins per-role,
 *                                 parent-only roles preserved
 *
 * This mirrors the intent of a designer declaring "my system is like the
 * parent but with these specific changes" — they expect parent decisions
 * they don't touch to remain, while overrides swap in cleanly.
 */
export function mergeExpression(
  parent: DesignFingerprint,
  child: Partial<DesignFingerprint>,
): DesignFingerprint {
  const merged: DesignFingerprint = {
    ...parent,
    ...stripUndefined(child),
  };

  if (parent.decisions || child.decisions) {
    merged.decisions = mergeByKey(
      parent.decisions ?? [],
      child.decisions ?? [],
      (d) => d.dimension,
    );
  }

  if (parent.roles || child.roles) {
    merged.roles = mergeByKey(
      parent.roles ?? [],
      child.roles ?? [],
      (r) => r.name,
    );
  }

  if (parent.palette || child.palette) {
    const pPal = parent.palette;
    const cPal = child.palette;
    merged.palette = {
      ...(pPal ?? emptyPalette()),
      ...(cPal ?? {}),
      dominant: mergeByKey(
        pPal?.dominant ?? [],
        cPal?.dominant ?? [],
        (c) => c.role,
      ),
      semantic: mergeByKey(
        pPal?.semantic ?? [],
        cPal?.semantic ?? [],
        (c) => c.role,
      ),
      // neutrals / saturationProfile / contrast: child replaces if present
      neutrals: cPal?.neutrals ?? pPal?.neutrals ?? { steps: [], count: 0 },
      saturationProfile:
        cPal?.saturationProfile ?? pPal?.saturationProfile ?? "muted",
      contrast: cPal?.contrast ?? pPal?.contrast ?? "moderate",
    };
  }

  return merged;
}

function mergeByKey<T>(parent: T[], child: T[], key: (item: T) => string): T[] {
  const childByKey = new Map(child.map((item) => [key(item), item]));
  const out: T[] = [];
  const seen = new Set<string>();

  // Parent order first, with child overrides slotted in place
  for (const item of parent) {
    const k = key(item);
    seen.add(k);
    const override = childByKey.get(k);
    out.push(override ?? item);
  }
  // Child-only entries appended at the end
  for (const item of child) {
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

function emptyPalette(): DesignFingerprint["palette"] {
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
