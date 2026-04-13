import { compareFingerprints } from "../fingerprint/compare.js";
import { embeddingDistance } from "../fingerprint/embedding.js";
import type { AgentContext, DesignFingerprint } from "../types.js";
import { BaseAgent } from "./base.js";
import type { AgentState } from "./types.js";

export interface ComplianceRule {
  name: string;
  description: string;
  severity: "error" | "warning" | "info";
  check: (fingerprint: DesignFingerprint) => ComplianceViolation | null;
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
  fingerprint: DesignFingerprint;
  rules?: ComplianceRule[];
  parentFingerprint?: DesignFingerprint;
  maxDriftDistance?: number;
  thresholds?: ComplianceThresholds;
}

export interface ComplianceThresholds {
  minTokenization?: number;
  minSemanticColors?: number;
  minSpacingScale?: number;
  maxDriftPerDimension?: number;
  maxOverallDrift?: number;
  requireFontFamilies?: boolean;
  requireBorderRadii?: boolean;
}

const DEFAULT_THRESHOLDS: ComplianceThresholds = {
  minTokenization: 0.1,
  minSemanticColors: 3,
  minSpacingScale: 3,
  maxDriftPerDimension: 0.5,
  maxOverallDrift: 0.3,
  requireFontFamilies: false,
  requireBorderRadii: false,
};

/**
 * Compliance Agent — "Does this meet standards?"
 *
 * Evaluates a fingerprint against:
 * 1. Built-in design quality checks (tokenization, color coverage, etc.)
 * 2. Custom rules passed by the user
 * 3. Drift distance from a parent fingerprint (if provided)
 *
 * Multi-turn: first pass runs deterministic checks, second pass
 * uses LLM to provide contextual suggestions for violations.
 */
export class ComplianceAgent extends BaseAgent<
  ComplianceInput,
  ComplianceReport
> {
  name = "compliance";
  maxIterations = 2;
  systemPrompt = `You are a design compliance agent. Your job is to evaluate whether
a design system meets specified standards and rules. Provide actionable suggestions
for each violation.`;

  protected async step(
    state: AgentState<ComplianceReport>,
    input: ComplianceInput,
    ctx: AgentContext,
  ): Promise<AgentState<ComplianceReport>> {
    if (state.iterations === 0) {
      // First iteration: deterministic checks
      const violations: ComplianceViolation[] = [];
      const thresholds = { ...DEFAULT_THRESHOLDS, ...input.thresholds };

      // Built-in quality checks
      violations.push(...this.checkTokenization(input.fingerprint, thresholds));
      violations.push(...this.checkPalette(input.fingerprint, thresholds));
      violations.push(...this.checkSpacing(input.fingerprint, thresholds));
      violations.push(...this.checkTypography(input.fingerprint, thresholds));
      violations.push(...this.checkSurfaces(input.fingerprint, thresholds));
      violations.push(
        ...this.checkArchitecture(input.fingerprint, thresholds),
      );

      // Custom rules
      if (input.rules) {
        for (const rule of input.rules) {
          const violation = rule.check(input.fingerprint);
          if (violation) violations.push(violation);
        }
      }

      // Drift checks against parent
      let driftSummary: ComplianceReport["driftSummary"];
      if (input.parentFingerprint) {
        const driftResult = this.checkDrift(
          input.fingerprint,
          input.parentFingerprint,
          thresholds,
        );
        violations.push(...driftResult.violations);
        driftSummary = driftResult.summary;
      }

      const errorCount = violations.filter(
        (v) => v.severity === "error",
      ).length;
      const warningCount = violations.filter(
        (v) => v.severity === "warning",
      ).length;
      const score = Math.max(
        0,
        1 - errorCount * 0.15 - warningCount * 0.05,
      );

      state.result = {
        passed: errorCount === 0,
        violations,
        score,
        driftSummary,
      };
      state.confidence = 0.85;
      state.reasoning.push(
        `${violations.length} violation(s): ${errorCount} errors, ${warningCount} warnings. Score: ${score.toFixed(2)}`,
      );

      if (!ctx.llm) {
        state.status = "completed";
      }

      return state;
    }

    if (state.iterations === 1 && ctx.llm && state.result) {
      // Second iteration: LLM-powered suggestions for violations without them
      state.reasoning.push(
        "LLM enrichment for compliance suggestions (not yet implemented)",
      );
      state.status = "completed";
      return state;
    }

    state.status = "completed";
    return state;
  }

  private checkTokenization(
    fp: DesignFingerprint,
    t: ComplianceThresholds,
  ): ComplianceViolation[] {
    const violations: ComplianceViolation[] = [];

    if (t.minTokenization && fp.architecture.tokenization < t.minTokenization) {
      violations.push({
        rule: "low-tokenization",
        severity: "warning",
        message: `Tokenization ratio is ${(fp.architecture.tokenization * 100).toFixed(0)}% (threshold: ${(t.minTokenization * 100).toFixed(0)}%)`,
        suggestion:
          "Extract repeated values into CSS custom properties or design tokens",
        dimension: "architecture",
        value: fp.architecture.tokenization,
      });
    }

    if (fp.architecture.tokenization === 0) {
      violations.push({
        rule: "no-tokens",
        severity: "error",
        message: "No design tokens detected — design system has no token layer",
        suggestion:
          "Define a token system using CSS custom properties, Style Dictionary, or similar",
        dimension: "architecture",
      });
    }

    return violations;
  }

  private checkPalette(
    fp: DesignFingerprint,
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

    if (
      t.minSemanticColors &&
      fp.palette.semantic.length < t.minSemanticColors
    ) {
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

  private checkSpacing(
    fp: DesignFingerprint,
    t: ComplianceThresholds,
  ): ComplianceViolation[] {
    const violations: ComplianceViolation[] = [];

    if (t.minSpacingScale && fp.spacing.scale.length < t.minSpacingScale) {
      violations.push({
        rule: "insufficient-spacing-scale",
        severity: "info",
        message: `Spacing scale has ${fp.spacing.scale.length} step(s) (recommended: ${t.minSpacingScale}+)`,
        suggestion: "Define a consistent spacing scale (e.g., 4, 8, 12, 16, 24, 32, 48, 64)",
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

  private checkTypography(
    fp: DesignFingerprint,
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
        suggestion: "Define a type scale (e.g., 12, 14, 16, 18, 20, 24, 30, 36, 48, 60)",
        dimension: "typography",
      });
    }

    return violations;
  }

  private checkSurfaces(
    fp: DesignFingerprint,
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

  private checkArchitecture(
    fp: DesignFingerprint,
    _t: ComplianceThresholds,
  ): ComplianceViolation[] {
    const violations: ComplianceViolation[] = [];

    if (fp.architecture.methodology.length === 0) {
      violations.push({
        rule: "unknown-methodology",
        severity: "info",
        message: "No CSS methodology detected (Tailwind, CSS Modules, etc.)",
        dimension: "architecture",
      });
    }

    if (fp.architecture.namingPattern === "unknown") {
      violations.push({
        rule: "unknown-naming",
        severity: "info",
        message: "Could not detect a consistent naming pattern for components",
        dimension: "architecture",
      });
    }

    return violations;
  }

  private checkDrift(
    child: DesignFingerprint,
    parent: DesignFingerprint,
    t: ComplianceThresholds,
  ): {
    violations: ComplianceViolation[];
    summary: ComplianceReport["driftSummary"];
  } {
    const violations: ComplianceViolation[] = [];
    const comparison = compareFingerprints(parent, child);

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
}
