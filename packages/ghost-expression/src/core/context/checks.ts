import type { Check, DriftSeverity, Expression } from "@ghost/core";
import {
  computeCheckSeverity,
  resolveMatchShape,
  resolveTolerance,
} from "@ghost/core";

export interface ResolvedCheck {
  check: Check;
  surveyCount: number;
  severity: DriftSeverity;
  match: string;
  tolerance: number | undefined;
}

const SEVERITY_ORDER: Record<DriftSeverity, number> = {
  critical: 0,
  serious: 1,
  nit: 2,
};

export function resolveExpressionChecks(fp: Expression): ResolvedCheck[] {
  return (fp.checks ?? []).map((check) => {
    const surveyCount = surveyCountForCheck(check, fp);
    return {
      check,
      surveyCount,
      severity: computeCheckSeverity(check, surveyCount),
      match: resolveMatchShape(check),
      tolerance: resolveTolerance(check),
    };
  });
}

export function bySeverityThenId(a: ResolvedCheck, b: ResolvedCheck): number {
  return (
    SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
    a.check.id.localeCompare(b.check.id)
  );
}

/**
 * Use check-authored observed counts when present. Otherwise fall back to a
 * coarse proxy for survey-count per canonical dimension, derived from the
 * structured frontmatter fields. v0 expressions don't carry the survey
 * directly; the proxy keeps presence-floor escalation deterministic until
 * the check author supplies `observed_count`.
 */
export function surveyCountForCheck(check: Check, fp: Expression): number {
  if (typeof check.observed_count === "number") return check.observed_count;

  switch (check.canonical) {
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
      // hint (check.presence_floor: 2+).
      return 100;
    default:
      // Unknown canonical -> leave room above floor 0 so escalation
      // doesn't fire incorrectly, but author can override via floor.
      return 100;
  }
}
