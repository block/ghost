import type {
  ExtractedMaterial,
  Extractor,
  ExtractorOptions,
  SampledMaterial,
  Target,
} from "../types.js";
import { cssExtractor } from "./css.js";
import { sampleDirectory } from "./sampler.js";
import { materializeGithub } from "./sources/github.js";
import { materializeNpm } from "./sources/npm.js";
import { materializeUrl } from "./sources/url.js";
import { tailwindExtractor } from "./tailwind.js";

// Ordered by specificity — more specific extractors first
const BUILTIN_EXTRACTORS: Extractor[] = [tailwindExtractor, cssExtractor];

export async function detectExtractors(cwd: string): Promise<Extractor[]> {
  const matched: Extractor[] = [];
  for (const extractor of BUILTIN_EXTRACTORS) {
    if (await extractor.detect(cwd)) {
      matched.push(extractor);
    }
  }
  return matched;
}

/**
 * Extract design material from a local directory.
 * Legacy API — used by the old profile() path.
 */
export async function extract(
  cwd: string,
  options?: ExtractorOptions & { extractorNames?: string[] },
): Promise<ExtractedMaterial> {
  let extractors: Extractor[];

  if (options?.extractorNames?.length) {
    extractors = BUILTIN_EXTRACTORS.filter((e) =>
      options.extractorNames?.includes(e.name),
    );
    if (!extractors.length) {
      throw new Error(
        `No matching extractors found for: ${options.extractorNames.join(", ")}`,
      );
    }
  } else {
    extractors = await detectExtractors(cwd);
    if (!extractors.length) {
      throw new Error(
        "No style framework detected. Ghost needs CSS custom properties, Tailwind, or similar.",
      );
    }
  }

  return extractors[0].extract(cwd, options);
}

/**
 * Sample design-relevant files from any target for LLM interpretation.
 * This is the v2 extraction pipeline — walk + sample, no parsing.
 */
export async function extractFromTarget(
  target: Target,
  options?: ExtractorOptions,
): Promise<SampledMaterial> {
  const localDir = await materializeTarget(target);
  return sampleDirectory(localDir, target.type, {
    maxFiles: options?.maxFiles ?? 200,
    ignore: options?.ignore,
  });
}

async function materializeTarget(target: Target): Promise<string> {
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

export { cssExtractor } from "./css.js";
export { sampleDirectory } from "./sampler.js";
export { tailwindExtractor } from "./tailwind.js";
export { walkAndCategorize, walkDirectory } from "./walker.js";
