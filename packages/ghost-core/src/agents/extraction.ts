import { sampleDirectory } from "../extractors/sampler.js";
import { materializeGithub } from "../extractors/sources/github.js";
import { materializeNpm } from "../extractors/sources/npm.js";
import { materializeUrl } from "../extractors/sources/url.js";
import type { AgentContext, SampledMaterial, Target } from "../types.js";
import { BaseAgent } from "./base.js";
import type { AgentState } from "./types.js";

/**
 * Extraction Agent — "What materials exist here?"
 *
 * Takes any Target, materializes it to a local directory,
 * walks the files, and returns a smart sample of the most
 * design-relevant files for LLM interpretation.
 *
 * This agent is purely mechanical — no LLM calls.
 * Always completes in a single iteration.
 */
export class ExtractionAgent extends BaseAgent<Target, SampledMaterial> {
  name = "extraction";
  maxIterations = 1;
  systemPrompt = "File extraction agent — walks and samples design-relevant files from any target.";

  protected async step(
    state: AgentState<SampledMaterial>,
    input: Target,
    _ctx: AgentContext,
  ): Promise<AgentState<SampledMaterial>> {
    try {
      // Materialize remote targets to local directory
      const localDir = await this.materialize(input);

      // Sample the most informative files
      const material = await sampleDirectory(localDir, input.type);

      state.result = material;
      state.confidence = material.files.length > 0 ? 0.9 : 0.3;
      state.reasoning.push(
        `Sampled ${material.metadata.sampledFiles} of ${material.metadata.totalFiles} files from ${input.type}:${input.value}`,
      );

      if (material.files.length === 0) {
        state.warnings.push("No design-relevant files found in target");
      }

      state.status = "completed";
    } catch (err) {
      state.warnings.push(
        `Extraction failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      state.status = "failed";
    }

    return state;
  }

  private async materialize(target: Target): Promise<string> {
    switch (target.type) {
      case "path":
        return target.value;
      case "url":
      case "registry":
        return materializeUrl(target.value);
      case "npm":
        return materializeNpm(target.value);
      case "github":
        return materializeGithub(target.value, target.options?.branch);
      case "figma":
        throw new Error("Figma extraction not yet implemented");
      case "doc-site":
        return materializeUrl(target.value);
      default:
        throw new Error(`Unsupported target type: ${target.type}`);
    }
  }
}
