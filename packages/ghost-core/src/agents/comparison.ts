import { compareFingerprints } from "../fingerprint/compare.js";
import { createProvider } from "../llm/index.js";
import type {
  AgentContext,
  DesignFingerprint,
  DivergenceClass,
  EnrichedComparison,
} from "../types.js";
import { BaseAgent } from "./base.js";
import type { AgentState } from "./types.js";

export interface ComparisonInput {
  source: DesignFingerprint;
  target: DesignFingerprint;
  sourceLabel?: string;
  targetLabel?: string;
}

/**
 * Comparison Agent — "How do these differ, and why?"
 *
 * Takes two fingerprints and produces an EnrichedComparison.
 * Classifies divergence as accidental drift, intentional variant,
 * evolution lag, or incompatible. Generates per-dimension explanations.
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
    ctx: AgentContext,
  ): Promise<AgentState<EnrichedComparison>> {
    if (state.iterations === 0) {
      // First iteration: deterministic comparison
      const comparison = compareFingerprints(input.source, input.target, {
        includeVectors: true,
      });

      // Deterministic classification based on comparison metrics
      const classification = this.classifyDivergence(comparison.distance);
      const explanations = this.generateDeterministicExplanations(comparison);

      state.result = {
        ...comparison,
        classification,
        explanations,
      };
      state.confidence = 0.6;
      state.reasoning.push(
        `Distance: ${comparison.distance.toFixed(3)}, Classification: ${classification}`,
      );

      if (!ctx.llm) {
        state.status = "completed";
      }

      return state;
    }

    if (state.iterations === 1 && ctx.llm && state.result) {
      // Second iteration: LLM-enriched explanations
      try {
        const enrichedExplanations =
          await this.generateLLMExplanations(state.result, input, ctx);
        const enrichedClassification = await this.classifyWithLLM(
          state.result,
          input,
          ctx,
        );

        state.result = {
          ...state.result,
          classification: enrichedClassification ?? state.result.classification,
          explanations: {
            ...state.result.explanations,
            ...enrichedExplanations,
          },
        };
        state.confidence = 0.85;
        state.reasoning.push("LLM-enriched explanations generated");
      } catch (err) {
        state.warnings.push(
          `LLM comparison enrichment failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      state.status = "completed";
      return state;
    }

    state.status = "completed";
    return state;
  }

  private classifyDivergence(distance: number): DivergenceClass {
    if (distance < 0.1) return "intentional-variant";
    if (distance < 0.3) return "accidental-drift";
    if (distance < 0.6) return "evolution-lag";
    return "incompatible";
  }

  private generateDeterministicExplanations(
    comparison: import("../types.js").FingerprintComparison,
  ): Record<string, string> {
    const explanations: Record<string, string> = {};

    for (const [dim, delta] of Object.entries(comparison.dimensions)) {
      if (delta.distance < 0.05) continue; // Skip negligible differences

      if (delta.distance > 0.5) {
        explanations[dim] =
          `Significant divergence (${delta.distance.toFixed(2)}): ${delta.description}`;
      } else if (delta.distance > 0.2) {
        explanations[dim] =
          `Moderate divergence (${delta.distance.toFixed(2)}): ${delta.description}`;
      } else {
        explanations[dim] =
          `Minor divergence (${delta.distance.toFixed(2)}): ${delta.description}`;
      }
    }

    return explanations;
  }

  private async generateLLMExplanations(
    _comparison: EnrichedComparison,
    _input: ComparisonInput,
    _ctx: AgentContext,
  ): Promise<Record<string, string>> {
    // TODO: Use LLM to generate richer, contextual explanations
    // For now, return empty (deterministic explanations are kept)
    return {};
  }

  private async classifyWithLLM(
    _comparison: EnrichedComparison,
    _input: ComparisonInput,
    _ctx: AgentContext,
  ): Promise<DivergenceClass | null> {
    // TODO: Use LLM for more nuanced classification
    return null;
  }
}
