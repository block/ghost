import { extract } from "../stages/extract.js";
import type { AgentContext, SampledMaterial, Target } from "../types.js";
import { BaseAgent } from "./base.js";
import type { AgentState } from "./types.js";

/**
 * @deprecated Use `extract()` from `stages/extract` instead.
 * This class is kept for backward compatibility but delegates to the stage function.
 */
export class ExtractionAgent extends BaseAgent<Target, SampledMaterial> {
  name = "extraction";
  maxIterations = 1;
  systemPrompt =
    "File extraction agent — walks and samples design-relevant files from any target.";

  protected async step(
    state: AgentState<SampledMaterial>,
    input: Target,
    _ctx: AgentContext,
  ): Promise<AgentState<SampledMaterial>> {
    try {
      const result = await extract(input);
      state.result = result.data;
      state.confidence = result.confidence;
      state.warnings.push(...result.warnings);
      state.reasoning.push(...result.reasoning);
      state.status = result.confidence > 0 ? "completed" : "failed";
    } catch (err) {
      state.warnings.push(
        `Extraction failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      state.status = "failed";
    }

    return state;
  }
}
