import { compareExpressions } from "../embedding/compare.js";
import type { Expression } from "../types.js";

export interface ComplianceRule {
  name: string;
  description: string;
  severity: "error" | "warning" | "info";
  check: (expression: Expression) => ComplianceViolation | null;
}

export interface ComplianceViolation {
  rule: string;
  severity: "error" | "warning" | "info";
  message: string;
  suggestion?: string;
  dimension?: string;
  value?: string | number;
}

export interface ComplianceReport {
  passed: boolean;
  violations: ComplianceViolation[];
  score: number;
  driftSummary?: {
    distance: number;
    dimensions: Record<string, number>;
    classification: string;
  };
}

export interface ComplianceInput {
  expression: Expression;
  rules?: ComplianceRule[];
  parentExpression?: Expression;
  maxDriftDistance?: number;
  thresholds?: ComplianceThresholds;
}

export interface ComplianceThresholds {
  minSemanticColors?: number;
  minSpacingScale?: number;
  maxDriftPerDimension?: number;
  maxOverallDrift?: number;
  requireFontFamilies?: boolean;
  requireBorderRadii?: boolean;
}

const DEFAULT_THRESHOLDS: ComplianceThresholds = {
  minSemanticColors: 3,
  minSpacingScale: 3,
  maxDriftPerDimension: 0.5,
  maxOverallDrift: 0.3,
  requireFontFamilies: false,
  requireBorderRadii: false,
};

/**
 * Check an expression against quality rules and parent drift thresholds.
 * Deterministic — no LLM calls.
 */
export function comply(input: ComplianceInput): ComplianceReport {
  const violations: ComplianceViolation[] = [];
  const thresholds = { ...DEFAULT_THRESHOLDS, ...input.thresholds };

  violations.push(...checkPalette(input.expression, thresholds));
  violations.push(...checkSpacing(input.expression, thresholds));
  violations.push(...checkTypography(input.expression, thresholds));
  violations.push(...checkSurfaces(input.expression, thresholds));

  if (input.rules) {
    for (const rule of input.rules) {
      const violation = rule.check(input.expression);
      if (violation) violations.push(violation);
    }
  }

  let driftSummary: ComplianceReport["driftSummary"];
  if (input.parentExpression) {
    const driftResult = checkDrift(
      input.expression,
      input.parentExpression,
      thresholds,
    );
    violations.push(...driftResult.violations);
    driftSummary = driftResult.summary;
  }

  const errorCount = violations.filter((v) => v.severity === "error").length;
  const warningCount = violations.filter(
    (v) => v.severity === "warning",
  ).length;
  const score = Math.max(0, 1 - errorCount * 0.15 - warningCount * 0.05);

  return {
    passed: errorCount === 0,
    violations,
    score,
    driftSummary,
  };
}

// --- Quality checks ---

function checkPalette(
  fp: Expression,
  t: ComplianceThresholds,
): ComplianceViolation[] {
  const violations: ComplianceViolation[] = [];

  if (fp.palette.dominant.length === 0 && fp.palette.semantic.length === 0) {
    violations.push({
      rule: "no-color-tokens",
      severity: "warning",
      message: "No color tokens detected in the design system",
      suggestion:
        "Define semantic colors (primary, secondary, accent, destructive, etc.)",
      dimension: "palette",
    });
  }

  if (t.minSemanticColors && fp.palette.semantic.length < t.minSemanticColors) {
    violations.push({
      rule: "insufficient-semantic-colors",
      severity: "warning",
      message: `Only ${fp.palette.semantic.length} semantic color(s) defined (recommended: ${t.minSemanticColors}+)`,
      suggestion:
        "Define roles: primary, secondary, accent, destructive, muted, border, background",
      dimension: "palette",
      value: fp.palette.semantic.length,
    });
  }

  return violations;
}

function checkSpacing(
  fp: Expression,
  t: ComplianceThresholds,
): ComplianceViolation[] {
  const violations: ComplianceViolation[] = [];

  if (t.minSpacingScale && fp.spacing.scale.length < t.minSpacingScale) {
    violations.push({
      rule: "insufficient-spacing-scale",
      severity: "info",
      message: `Spacing scale has ${fp.spacing.scale.length} step(s) (recommended: ${t.minSpacingScale}+)`,
      suggestion:
        "Define a consistent spacing scale (e.g., 4, 8, 12, 16, 24, 32, 48, 64)",
      dimension: "spacing",
      value: fp.spacing.scale.length,
    });
  }

  if (fp.spacing.regularity < 0.3 && fp.spacing.scale.length > 2) {
    violations.push({
      rule: "irregular-spacing",
      severity: "info",
      message: `Spacing scale has low regularity (${(fp.spacing.regularity * 100).toFixed(0)}%) — values don't follow a consistent pattern`,
      suggestion:
        "Consider using a geometric or linear scale for consistent spacing",
      dimension: "spacing",
      value: fp.spacing.regularity,
    });
  }

  return violations;
}

function checkTypography(
  fp: Expression,
  t: ComplianceThresholds,
): ComplianceViolation[] {
  const violations: ComplianceViolation[] = [];

  if (t.requireFontFamilies && fp.typography.families.length === 0) {
    violations.push({
      rule: "no-font-families",
      severity: "warning",
      message: "No font families detected in the design system",
      suggestion: "Define font family tokens for headings and body text",
      dimension: "typography",
    });
  }

  if (fp.typography.sizeRamp.length === 0) {
    violations.push({
      rule: "no-type-scale",
      severity: "info",
      message: "No typography size scale detected",
      suggestion:
        "Define a type scale (e.g., 12, 14, 16, 18, 20, 24, 30, 36, 48, 60)",
      dimension: "typography",
    });
  }

  return violations;
}

function checkSurfaces(
  fp: Expression,
  t: ComplianceThresholds,
): ComplianceViolation[] {
  const violations: ComplianceViolation[] = [];

  if (t.requireBorderRadii && fp.surfaces.borderRadii.length === 0) {
    violations.push({
      rule: "no-border-radii",
      severity: "info",
      message: "No border radius tokens detected",
      suggestion: "Define border radius tokens (e.g., sm, md, lg, full)",
      dimension: "surfaces",
    });
  }

  return violations;
}

function checkDrift(
  child: Expression,
  parent: Expression,
  t: ComplianceThresholds,
): {
  violations: ComplianceViolation[];
  summary: ComplianceReport["driftSummary"];
} {
  const violations: ComplianceViolation[] = [];
  const comparison = compareExpressions(parent, child);

  const maxOverall = t.maxOverallDrift ?? 0.3;
  const maxPerDim = t.maxDriftPerDimension ?? 0.5;

  if (comparison.distance > maxOverall) {
    violations.push({
      rule: "excessive-overall-drift",
      severity: "error",
      message: `Overall drift distance ${comparison.distance.toFixed(3)} exceeds threshold ${maxOverall}`,
      suggestion:
        "Review divergent dimensions and either realign or acknowledge the drift",
      value: comparison.distance,
    });
  }

  const dimensionDistances: Record<string, number> = {};
  for (const [dim, delta] of Object.entries(comparison.dimensions)) {
    dimensionDistances[dim] = delta.distance;

    if (delta.distance > maxPerDim) {
      violations.push({
        rule: "excessive-dimension-drift",
        severity: "warning",
        message: `${dim} drift ${delta.distance.toFixed(3)} exceeds threshold ${maxPerDim}: ${delta.description}`,
        dimension: dim,
        value: delta.distance,
      });
    }
  }

  let classification: string;
  if (comparison.distance < 0.1) classification = "aligned";
  else if (comparison.distance < 0.3) classification = "minor-drift";
  else if (comparison.distance < 0.6) classification = "significant-drift";
  else classification = "major-divergence";

  return {
    violations,
    summary: {
      distance: comparison.distance,
      dimensions: dimensionDistances,
      classification,
    },
  };
}
