import type { DriftSeverity, Expression, Rule } from "@ghost/core";
import {
  computeRuleSeverity,
  resolveMatchShape,
  resolveTolerance,
} from "@ghost/core";

export interface ResolvedRule {
  rule: Rule;
  bucketCount: number;
  severity: DriftSeverity;
  match: string;
  tolerance: number | undefined;
}

const SEVERITY_ORDER: Record<DriftSeverity, number> = {
  critical: 0,
  serious: 1,
  nit: 2,
};

export function resolveExpressionRules(fp: Expression): ResolvedRule[] {
  return (fp.rules ?? []).map((rule) => {
    const bucketCount = bucketCountForRule(rule, fp);
    return {
      rule,
      bucketCount,
      severity: computeRuleSeverity(rule, bucketCount),
      match: resolveMatchShape(rule),
      tolerance: resolveTolerance(rule),
    };
  });
}

export function bySeverityThenId(a: ResolvedRule, b: ResolvedRule): number {
  return (
    SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
    a.rule.id.localeCompare(b.rule.id)
  );
}

/**
 * Use rule-authored observed counts when present. Otherwise fall back to a
 * coarse proxy for bucket-count per canonical dimension, derived from the
 * structured frontmatter fields. v0 expressions don't carry the bucket
 * directly; the proxy keeps presence-floor escalation deterministic until
 * the rule author supplies `observed_count` or `loadExpression` can return
 * the bucket alongside the expression.
 */
export function bucketCountForRule(rule: Rule, fp: Expression): number {
  if (typeof rule.observed_count === "number") return rule.observed_count;

  switch (rule.canonical) {
    case "color-strategy":
      return (
        fp.palette.dominant.length +
        fp.palette.neutrals.count +
        fp.palette.semantic.length
      );
    case "surface-hierarchy":
      return fp.palette.semantic.length + fp.palette.dominant.length;
    case "shape-language":
      return fp.surfaces.borderRadii.length;
    case "elevation":
      return fp.surfaces.shadowComplexity === "deliberate-none"
        ? 0
        : fp.surfaces.shadowComplexity === "subtle"
          ? 2
          : 5;
    case "spatial-system":
    case "density":
      return fp.spacing.scale.length;
    case "typography-voice":
      return fp.typography.sizeRamp.length;
    case "font-sourcing":
      return fp.typography.families.length;
    case "motion":
      // Motion isn't in structured fields; default to a count above
      // typical floors so escalation only happens via explicit author
      // hint (rule.presence_floor: 2+).
      return 100;
    default:
      // Unknown canonical -> leave room above floor 0 so escalation
      // doesn't fire incorrectly, but author can override via floor.
      return 100;
  }
}
