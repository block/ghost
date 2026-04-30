/**
 * Canonical decision-dimension vocabulary.
 *
 * Free-form `decisions[].dimension` slugs are great for authoring but bad
 * for fleet aggregation: ghost-ui's `color-strategy` and a hypothetical
 * Cash app's `color-system` describe the same axis under different names,
 * and N-way overlap on incidentally-shared labels is not a basis for
 * cross-system distance.
 *
 * The fix is a small controlled vocabulary. Profilers pick from this list
 * first; non-canonical slugs are still permitted (the schema allows any
 * string), but the recommended pattern is to pair them with a
 * `dimension_kind` that maps to a canonical slug. Lint warns when a
 * non-canonical dimension has no canonical kind. Fleet-rollup primitives
 * group by `dimension_kind` (or by `dimension` when it's already
 * canonical) so the decision-overlap distance axis becomes meaningful.
 *
 * The list below was derived from the actual decisions produced by
 * profiling ghost-ui — these are not invented categories, they are the
 * orthogonal-ish axes that one real expression already surfaces.
 */
export const CANONICAL_DECISION_DIMENSIONS = [
  "color-strategy",
  "surface-hierarchy",
  "shape-language",
  "typography-voice",
  "spatial-system",
  "density",
  "motion",
  "elevation",
  "theming-architecture",
  "interactive-patterns",
  "token-architecture",
  "font-sourcing",
] as const;

export type CanonicalDecisionDimension =
  (typeof CANONICAL_DECISION_DIMENSIONS)[number];

const CANONICAL_SET: ReadonlySet<string> = new Set(
  CANONICAL_DECISION_DIMENSIONS,
);

/**
 * Direct synonyms — common slug variants we've observed or expect, mapped
 * to the canonical dimension. Lookup is exact-match (post-normalization).
 */
const SYNONYMS: Readonly<Record<string, CanonicalDecisionDimension>> = {
  // color-strategy
  "color-system": "color-strategy",
  "color-philosophy": "color-strategy",
  "color-approach": "color-strategy",
  "palette-strategy": "color-strategy",
  "palette-system": "color-strategy",
  "hue-strategy": "color-strategy",
  // surface-hierarchy
  "surface-vocabulary": "surface-hierarchy",
  "surface-system": "surface-hierarchy",
  "background-hierarchy": "surface-hierarchy",
  "background-system": "surface-hierarchy",
  // shape-language
  "radius-philosophy": "shape-language",
  "radius-strategy": "shape-language",
  "corner-treatment": "shape-language",
  "corner-radii": "shape-language",
  geometry: "shape-language",
  // typography-voice
  "type-voice": "typography-voice",
  "type-stack": "typography-voice",
  "type-hierarchy": "typography-voice",
  "typographic-voice": "typography-voice",
  "typography-system": "typography-voice",
  // spatial-system
  spacing: "spatial-system",
  "spacing-scale": "spatial-system",
  "spacing-system": "spatial-system",
  "layout-rhythm": "spatial-system",
  // density
  compactness: "density",
  "control-density": "density",
  // motion
  animation: "motion",
  "motion-language": "motion",
  "motion-system": "motion",
  "animation-philosophy": "motion",
  // elevation
  "shadow-system": "elevation",
  "shadow-vocabulary": "elevation",
  "depth-language": "elevation",
  // theming-architecture
  theming: "theming-architecture",
  "theme-architecture": "theming-architecture",
  "theme-system": "theming-architecture",
  themeability: "theming-architecture",
  // interactive-patterns
  "interaction-patterns": "interactive-patterns",
  "focus-treatment": "interactive-patterns",
  "hover-system": "interactive-patterns",
  "interaction-design": "interactive-patterns",
  // token-architecture
  "token-system": "token-architecture",
  "token-cascade": "token-architecture",
  "token-layering": "token-architecture",
  // font-sourcing
  "font-stack": "font-sourcing",
  "font-strategy": "font-sourcing",
  "font-loading": "font-sourcing",
  "font-bundling": "font-sourcing",
};

/**
 * Token-level affinity — when a slug has no direct synonym, score it by
 * how strongly its dash-separated tokens evoke each canonical dimension.
 * The token "color" alone is a strong signal for color-strategy; "shadow"
 * is strong for elevation. Used by `closestCanonical` as a fallback.
 *
 * Each entry is `[token, dimension]`. A token may map to multiple
 * dimensions (e.g. "font" hints both font-sourcing and typography-voice);
 * the scorer sums signals across dimensions and returns the strongest.
 */
const TOKEN_HINTS: ReadonlyArray<
  readonly [string, CanonicalDecisionDimension]
> = [
  ["color", "color-strategy"],
  ["palette", "color-strategy"],
  ["hue", "color-strategy"],
  ["chroma", "color-strategy"],
  ["surface", "surface-hierarchy"],
  ["background", "surface-hierarchy"],
  ["bg", "surface-hierarchy"],
  ["radius", "shape-language"],
  ["radii", "shape-language"],
  ["corner", "shape-language"],
  ["shape", "shape-language"],
  ["pill", "shape-language"],
  ["typography", "typography-voice"],
  ["type", "typography-voice"],
  ["typographic", "typography-voice"],
  ["heading", "typography-voice"],
  ["spacing", "spatial-system"],
  ["space", "spatial-system"],
  ["spatial", "spatial-system"],
  ["layout", "spatial-system"],
  ["rhythm", "spatial-system"],
  ["density", "density"],
  ["compact", "density"],
  ["motion", "motion"],
  ["animation", "motion"],
  ["transition", "motion"],
  ["shadow", "elevation"],
  ["elevation", "elevation"],
  ["depth", "elevation"],
  ["theme", "theming-architecture"],
  ["theming", "theming-architecture"],
  ["themeable", "theming-architecture"],
  ["interaction", "interactive-patterns"],
  ["interactive", "interactive-patterns"],
  ["focus", "interactive-patterns"],
  ["hover", "interactive-patterns"],
  ["token", "token-architecture"],
  ["alias", "token-architecture"],
  ["cascade", "token-architecture"],
  ["font", "font-sourcing"],
  ["typeface", "font-sourcing"],
];

/**
 * Normalize a dimension slug for lookup: trim, lowercase, collapse
 * separators (`_`, ` `, repeated `-`) into single dashes.
 */
function normalize(slug: string): string {
  return slug
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Returns true when `slug` is in the canonical vocabulary (after
 * normalization). Use to gate fleet-aggregation paths that require
 * commensurable dimension labels across members.
 */
export function isCanonicalDimension(
  slug: string,
): slug is CanonicalDecisionDimension {
  return CANONICAL_SET.has(normalize(slug));
}

/**
 * Suggest the closest canonical dimension for a free-form slug.
 *
 * Resolution order:
 *  1. Exact canonical match (after normalization).
 *  2. Direct synonym lookup.
 *  3. Token-affinity scoring across `TOKEN_HINTS` — wins when a single
 *     dimension scores strictly higher than all others.
 *  4. `null` when there's no clear winner. Callers should treat null as
 *     "this slug is genuinely novel; lint warns and the profile keeps it
 *     long-tail."
 *
 * Pure / deterministic. No I/O.
 */
export function closestCanonical(
  slug: string,
): CanonicalDecisionDimension | null {
  if (!slug) return null;
  const norm = normalize(slug);
  if (!norm) return null;

  if (CANONICAL_SET.has(norm)) return norm as CanonicalDecisionDimension;

  const synonym = SYNONYMS[norm];
  if (synonym) return synonym;

  const tokens = norm.split("-").filter(Boolean);
  if (tokens.length === 0) return null;

  const scores = new Map<CanonicalDecisionDimension, number>();
  for (const token of tokens) {
    for (const [hint, dim] of TOKEN_HINTS) {
      if (hint === token) {
        scores.set(dim, (scores.get(dim) ?? 0) + 1);
      }
    }
  }
  if (scores.size === 0) return null;

  let best: CanonicalDecisionDimension | null = null;
  let bestScore = 0;
  let tied = false;
  for (const [dim, score] of scores) {
    if (score > bestScore) {
      best = dim;
      bestScore = score;
      tied = false;
    } else if (score === bestScore) {
      tied = true;
    }
  }
  return tied ? null : best;
}

/**
 * Resolve a decision's effective canonical dimension for fleet rollup:
 * prefer an explicit `dimension_kind` (when it's canonical), otherwise
 * fall back to the slug if it's canonical, otherwise null.
 *
 * The fleet aggregator groups decisions by this resolved value; null
 * means the decision lives in the long tail and is reported per-member,
 * not aggregated.
 */
export function resolveDecisionKind(decision: {
  dimension: string;
  dimension_kind?: string;
}): CanonicalDecisionDimension | null {
  if (decision.dimension_kind) {
    const norm = normalize(decision.dimension_kind);
    if (CANONICAL_SET.has(norm)) return norm as CanonicalDecisionDimension;
  }
  const norm = normalize(decision.dimension);
  if (CANONICAL_SET.has(norm)) return norm as CanonicalDecisionDimension;
  return null;
}
