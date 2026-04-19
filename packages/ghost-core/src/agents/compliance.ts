import { comply } from "../stages/comply.js";
import type { AgentContext, Expression } from "../types.js";
import { BaseAgent } from "./base.js";
import type { AgentState } from "./types.js";

export interface ComplianceRule {
  name: string;
  description: string;
  severity: "error" | "warning" | "info";
  check: (fingerprint: Expression) => ComplianceViolation | null;
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
  fingerprint: Expression;
  rules?: ComplianceRule[];
  parentFingerprint?: Expression;
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

/**
 * @deprecated Use `comply()` from `stages/comply` instead.
 * This class is kept for backward compatibility but delegates to the stage function.
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
    _ctx: AgentContext,
  ): Promise<AgentState<ComplianceReport>> {
    try {
      const result = await comply(input);
      state.result = result.data;
      state.confidence = result.confidence;
      state.warnings.push(...result.warnings);
      state.reasoning.push(...result.reasoning);
      state.status = "completed";
    } catch (err) {
      state.warnings.push(
        `Compliance check failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      state.status = "failed";
    }

    return state;
  }
}
