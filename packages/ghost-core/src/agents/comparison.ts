import { compare } from "../stages/compare.js";
import type { AgentContext, EnrichedComparison, Expression } from "../types.js";
import { BaseAgent } from "./base.js";
import type { AgentState } from "./types.js";

export interface ComparisonInput {
  source: Expression;
  target: Expression;
  sourceLabel?: string;
  targetLabel?: string;
}

/**
 * @deprecated Use `compare()` from `stages/compare` instead.
 * This class is kept for backward compatibility but delegates to the stage function.
 */
export class ComparisonAgent extends BaseAgent<
  ComparisonInput,
  EnrichedComparison
> {
  name = "comparison";
  maxIterations = 2;
  systemPrompt = `You are a design comparison agent. Your job is to compare two
design fingerprints and explain the differences.

For each divergent dimension, classify the divergence:
- accidental-drift: unintentional differences (hardcoded values, overrides)
- intentional-variant: coherent, systematic divergence (density variant, dark mode)
- evolution-lag: parent has moved, consumer hasn't caught up
- incompatible: fundamentally different design languages

Provide human-readable explanations for each significant difference.`;

  protected async step(
    state: AgentState<EnrichedComparison>,
    input: ComparisonInput,
    _ctx: AgentContext,
  ): Promise<AgentState<EnrichedComparison>> {
    try {
      const result = await compare(input);
      state.result = result.data;
      state.confidence = result.confidence;
      state.warnings.push(...result.warnings);
      state.reasoning.push(...result.reasoning);
      state.status = "completed";
    } catch (err) {
      state.warnings.push(
        `Comparison failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      state.status = "failed";
    }

    return state;
  }
}
