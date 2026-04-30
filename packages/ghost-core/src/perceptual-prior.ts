/**
 * Ghost's perceptual prior — the opinionated stance that drift severity
 * should track *how loudly a change registers visually*, not just whether
 * it deviates from a recorded value.
 *
 * Three perceptual tiers:
 *
 *   - **loud**: visible at first glance, no inspection required. Color
 *     and typeface family are loud — a new color or font is the change
 *     everyone notices.
 *   - **structural**: visible on inspection or interaction. Radius
 *     philosophy (pill vs. boxy), elevation vocabulary, focus treatment.
 *     Pill among boxes screams; the wrong shadow on a flat system jars.
 *   - **rhythmic**: visible only as a system property. Spacing scale
 *     adherence, density, motion duration. Individual deviations are
 *     nearly imperceptible — the rhythm matters in aggregate.
 *
 * Two cross-cutting rules:
 *
 *   1. **Match shape** is per-`RuleKind`: color is `exact`, spacing is
 *      `band`, type-size is `percent`, radius/shadow are `structural`.
 *      Defaults are sensible; per-rule overrides remain available.
 *   2. **Presence/absence escalation**: when bucket count for a
 *      dimension is ≤ `presence_floor`, escalate the rule one tier.
 *      Sparsity is the design decision — adding to a silent dimension
 *      is the loudest possible change regardless of base tier.
 *
 * Tier membership is a position: projects can override per-rule severity
 * but cannot remap a dimension's tier. The tiers are the product.
 */

import type { CanonicalDecisionDimension } from "./decision-vocabulary.js";
import type { DriftSeverity, Rule, RuleKind, RuleMatchShape } from "./types.js";

// --- Tier table ---------------------------------------------------------

export type PerceptualTier = "loud" | "structural" | "rhythmic";

/**
 * Maps each canonical dimension to its perceptual tier. The mapping is a
 * position, not configuration — see module docstring.
 *
 * Notes on a few placements:
 *   - `typography-voice` is structural at the dimension level; a foreign
 *     font *family* is loud (handled by `RuleKind: "type-family"`), while
 *     size-detail drift is rhythmic (handled by `RuleKind: "type-size"`).
 *     Per-rule kind escalation handles that split.
 *   - `interactive-patterns` is structural — focus rings register on
 *     interaction, not at first glance.
 *   - `theming-architecture` and `token-architecture` are rhythmic —
 *     they're plumbing, perceptible only via downstream symptoms.
 */
export const PERCEPTUAL_TIER: Readonly<
  Record<CanonicalDecisionDimension, PerceptualTier>
> = {
  "color-strategy": "loud",
  "font-sourcing": "loud",
  "typography-voice": "structural",
  "shape-language": "structural",
  elevation: "structural",
  "surface-hierarchy": "structural",
  "interactive-patterns": "structural",
  "spatial-system": "rhythmic",
  density: "rhythmic",
  motion: "rhythmic",
  "theming-architecture": "rhythmic",
  "token-architecture": "rhythmic",
};

/**
 * Per-tier default severity for emitted reviewer rules. The emitter writes
 * the resolved severity into the slash command so the reader sees a flat
 * Critical / Serious / Nit grouping rather than a per-dimension layout.
 */
export const TIER_SEVERITY: Readonly<Record<PerceptualTier, DriftSeverity>> = {
  loud: "critical",
  structural: "serious",
  rhythmic: "nit",
};

// --- Match shape and tolerance defaults --------------------------------

/**
 * Default match shape per rule kind. Color demands exact equality (any
 * non-allowed hex is drift). Spacing tolerates a small absolute band
 * because 7px-vs-8px is invisible. Type size uses a percentage band
 * because 14→15px is invisible but 14→24px is loud. Radius and shadow
 * are structural — pill vs. non-pill matters more than 999 vs. 998.
 */
export const DEFAULT_MATCH: Readonly<Record<RuleKind, RuleMatchShape>> = {
  color: "exact",
  radius: "structural",
  spacing: "band",
  "type-size": "percent",
  "type-family": "exact",
  "type-weight": "exact",
  shadow: "structural",
  motion: "exact",
};

/**
 * Default tolerance for each match shape. Absent for `exact` and
 * `structural` (no tolerance applies). Used when a rule selects a match
 * shape but doesn't specify a tolerance.
 */
export const DEFAULT_TOLERANCE: Readonly<
  Record<RuleMatchShape, number | undefined>
> = {
  exact: undefined,
  structural: undefined,
  band: 2, // ±2 in source unit (typically px)
  percent: 0.1, // ±10% relative
};

// --- Severity computation ----------------------------------------------

const TIER_ORDER: PerceptualTier[] = ["rhythmic", "structural", "loud"];

/**
 * Escalate a tier one step toward `loud`. `loud` saturates — escalating
 * a loud rule against an absent dimension is still critical.
 */
export function escalateTier(tier: PerceptualTier): PerceptualTier {
  const idx = TIER_ORDER.indexOf(tier);
  if (idx < 0) return tier;
  return TIER_ORDER[Math.min(idx + 1, TIER_ORDER.length - 1)] as PerceptualTier;
}

/**
 * Resolve a canonical dimension to its perceptual tier. Returns
 * `structural` for unknown / non-canonical inputs — the conservative
 * default. The emitter / lint should warn on non-canonical rules so
 * they're caught at authoring time.
 */
export function tierForCanonical(
  canonical: string | undefined,
): PerceptualTier {
  if (!canonical) return "structural";
  const tier = (PERCEPTUAL_TIER as Record<string, PerceptualTier | undefined>)[
    canonical
  ];
  return tier ?? "structural";
}

/**
 * Apply presence/absence escalation: when `bucketCount <= presenceFloor`,
 * the dimension is silent (or near-silent) in the project, so any rule
 * guarding it is one tier louder than its base.
 *
 * `presenceFloor` defaults to 0 — only completely-absent dimensions
 * trigger escalation by default. Rules that want softer escalation
 * (motion in a system with 1–2 structural transitions, say) can set a
 * higher floor.
 */
export function escalateForPresence(
  base: PerceptualTier,
  bucketCount: number,
  presenceFloor = 0,
): PerceptualTier {
  if (bucketCount <= presenceFloor) return escalateTier(base);
  return base;
}

/**
 * Compute the final severity for a rule, given its canonical dimension
 * and the bucket count for that dimension in the current expression.
 *
 * Resolution order:
 *   1. Explicit `rule.severity` wins outright.
 *   2. Otherwise, base tier from `rule.canonical` → `tierForCanonical`.
 *   3. Apply presence/absence escalation against `rule.presence_floor`
 *      (default 0) and the supplied `bucketCount`.
 *   4. Map tier → severity via `TIER_SEVERITY`.
 *
 * Pure / deterministic.
 */
export function computeRuleSeverity(
  rule: Pick<Rule, "canonical" | "severity" | "presence_floor">,
  bucketCount: number,
): DriftSeverity {
  if (rule.severity) return rule.severity;
  const baseTier = tierForCanonical(rule.canonical);
  const finalTier = escalateForPresence(
    baseTier,
    bucketCount,
    rule.presence_floor ?? 0,
  );
  return TIER_SEVERITY[finalTier];
}

/**
 * Compute the final match shape for a rule. Explicit `rule.match` wins;
 * otherwise the default for the rule's kind. Returns `exact` when neither
 * is set — the most conservative shape.
 */
export function resolveMatchShape(
  rule: Pick<Rule, "match" | "kind">,
): RuleMatchShape {
  if (rule.match) return rule.match;
  if (rule.kind) return DEFAULT_MATCH[rule.kind];
  return "exact";
}

/**
 * Compute the final tolerance for a rule. Explicit `rule.tolerance` wins;
 * otherwise the default for the resolved match shape. Returns `undefined`
 * for exact/structural matches, where tolerance doesn't apply.
 */
export function resolveTolerance(
  rule: Pick<Rule, "match" | "kind" | "tolerance">,
): number | undefined {
  if (rule.tolerance !== undefined) return rule.tolerance;
  const shape = resolveMatchShape(rule);
  return DEFAULT_TOLERANCE[shape];
}
