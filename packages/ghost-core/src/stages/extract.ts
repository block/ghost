import { sampleDirectory } from "../extractors/sampler.js";
import { materializeGithub } from "../extractors/sources/github.js";
import { materializeNpm } from "../extractors/sources/npm.js";
import { materializeUrl } from "../extractors/sources/url.js";
import type { SampledMaterial, Target } from "../types.js";
import type { StageContext, StageResult } from "./types.js";

/**
 * Extract design-relevant files from any target.
 *
 * Materializes remote targets to a local directory, walks the file tree,
 * and returns a scored sample of the most informative files for analysis.
 *
 * Pure deterministic — no LLM calls.
 */
export async function extract(
  target: Target,
  _ctx?: StageContext,
): Promise<StageResult<SampledMaterial>> {
  const startTime = Date.now();

  try {
    const localDir = await materialize(target);
    const material = await sampleDirectory(localDir, target.type);

    return {
      data: material,
      confidence: material.files.length > 0 ? 0.9 : 0.3,
      warnings:
        material.files.length === 0
          ? ["No design-relevant files found in target"]
          : [],
      reasoning: [
        `Sampled ${material.metadata.sampledFiles} of ${material.metadata.totalFiles} files from ${target.type}:${target.value}`,
      ],
      duration: Date.now() - startTime,
    };
  } catch (err) {
    return {
      data: {
        files: [],
        metadata: {
          totalFiles: 0,
          sampledFiles: 0,
          targetType: target.type,
        },
      },
      confidence: 0,
      warnings: [
        `Extraction failed: ${err instanceof Error ? err.message : String(err)}`,
      ],
      reasoning: [],
      duration: Date.now() - startTime,
    };
  }
}

/** The local directory path after materialization (exposed for tool context). */
export async function materializeTarget(target: Target): Promise<string> {
  return materialize(target);
}

async function materialize(target: Target): Promise<string> {
  switch (target.type) {
    case "path":
      return target.value;
    case "url":
    case "registry":
    case "doc-site":
      return materializeUrl(target.value);
    case "npm":
      return materializeNpm(target.value);
    case "github":
      return materializeGithub(target.value, target.options?.branch);
    case "figma":
      throw new Error("Figma extraction not yet implemented");
    default:
      throw new Error(`Unsupported target type: ${target.type}`);
  }
}
