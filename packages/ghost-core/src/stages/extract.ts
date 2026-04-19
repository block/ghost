import { sampleDirectory } from "../extractors/sampler.js";
import { materializeGithub } from "../extractors/sources/github.js";
import { materializeNpm } from "../extractors/sources/npm.js";
import { materializeUrl } from "../extractors/sources/url.js";
import { walkDirectory } from "../extractors/walker.js";
import type { SampledMaterial, SourceInfo, Target } from "../types.js";
import type { StageContext, StageResult } from "./types.js";

export type ExtractResult = StageResult<SampledMaterial> & {
  dirs: { label: string; dir: string }[];
};

/**
 * Extract design-relevant files from one or more targets.
 *
 * Materializes each target in parallel, samples design-signal files from each,
 * and returns a combined SampledMaterial plus the materialized source directories
 * (so the expression agent's tools can read files from any source).
 *
 * Single-source and multi-source share the same shape — callers don't branch.
 *
 * Pure deterministic — no LLM calls.
 */
export async function extract(
  targets: Target[],
  _ctx?: StageContext,
): Promise<ExtractResult> {
  const startTime = Date.now();

  const results = await Promise.allSettled(
    targets.map(async (target) => ({
      target,
      dir: await materialize(target),
      label: targetLabel(target),
    })),
  );

  const materialized: { target: Target; dir: string; label: string }[] = [];
  const warnings: string[] = [];

  for (const result of results) {
    if (result.status === "fulfilled") {
      materialized.push(result.value);
    } else {
      warnings.push(
        `Failed to materialize source: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`,
      );
    }
  }

  if (materialized.length === 0) {
    return {
      data: {
        files: [],
        metadata: {
          totalFiles: 0,
          sampledFiles: 0,
          targetType: targets[0]?.type ?? "path",
        },
      },
      dirs: [],
      confidence: 0,
      warnings: ["All sources failed to materialize", ...warnings],
      reasoning: [],
      duration: Date.now() - startTime,
    };
  }

  const sourceInfos: SourceInfo[] = [];
  const allFiles: SampledMaterial["files"] = [];
  let totalFileCount = 0;
  let firstPackageJson: SampledMaterial["metadata"]["packageJson"];
  let firstPackageSwift: SampledMaterial["metadata"]["packageSwift"];

  for (const src of materialized) {
    const material = await sampleDirectory(src.dir, src.target.type);
    const walkedFiles = await walkDirectory(src.dir);

    for (const file of material.files) {
      allFiles.push({
        ...file,
        sourceLabel: src.label,
      });
    }

    sourceInfos.push({
      label: src.label,
      targetType: src.target.type,
      fileCount: walkedFiles.length,
      sampledCount: material.files.length,
    });

    totalFileCount += walkedFiles.length;

    if (!firstPackageJson && material.metadata.packageJson) {
      firstPackageJson = material.metadata.packageJson;
    }
    if (!firstPackageSwift && material.metadata.packageSwift) {
      firstPackageSwift = material.metadata.packageSwift;
    }
  }

  const combined: SampledMaterial = {
    files: allFiles,
    metadata: {
      totalFiles: totalFileCount,
      sampledFiles: allFiles.length,
      targetType: materialized[0].target.type,
      sources: sourceInfos,
      packageJson: firstPackageJson,
      packageSwift: firstPackageSwift,
    },
  };

  const dirs = materialized.map((m) => ({ label: m.label, dir: m.dir }));
  const multi = materialized.length > 1;

  return {
    data: combined,
    dirs,
    confidence: combined.files.length > 0 ? 0.9 : 0.3,
    warnings:
      combined.files.length === 0
        ? [
            `No design-relevant files found${multi ? " across any source" : ""}`,
            ...warnings,
          ]
        : warnings,
    reasoning: [
      multi
        ? `Sampled ${combined.metadata.sampledFiles} files from ${totalFileCount} total across ${materialized.length} source(s)`
        : `Sampled ${combined.metadata.sampledFiles} of ${totalFileCount} files from ${materialized[0].target.type}:${materialized[0].target.value}`,
      ...(multi ? materialized.map((m) => `  ${m.label}: materialized`) : []),
    ],
    duration: Date.now() - startTime,
  };
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

function targetLabel(target: Target): string {
  if (target.name) return target.name;
  if (target.type === "path") return target.value;
  return `${target.type}:${target.value}`;
}
