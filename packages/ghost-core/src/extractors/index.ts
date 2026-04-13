import { existsSync } from "node:fs";
import { join } from "node:path";
import type {
  ExtractedMaterial,
  Extractor,
  ExtractorOptions,
  Target,
} from "../types.js";
import { cssExtractor } from "./css.js";
import { detectFormats } from "./format-detector.js";
import { normalizeTokens } from "./normalizer.js";
import { materializeGithub } from "./sources/github.js";
import { materializeNpm } from "./sources/npm.js";
import { materializeUrl } from "./sources/url.js";
import { tailwindExtractor } from "./tailwind.js";
import { walkAndCategorize } from "./walker.js";

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
 * Legacy API — delegates to the universal pipeline for "path" targets.
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

  // Use the most specific extractor (first match)
  return extractors[0].extract(cwd, options);
}

/**
 * Extract design material from any target.
 *
 * This is the universal extraction pipeline:
 * 1. Materialize remote sources to local temp directories
 * 2. Walk files to collect all relevant content
 * 3. Detect token formats
 * 4. Normalize tokens across formats
 * 5. Return ExtractedMaterial with metadata
 */
export async function extractFromTarget(
  target: Target,
  options?: ExtractorOptions,
): Promise<ExtractedMaterial> {
  // Step 1: Get a local directory path
  const localDir = await materializeTarget(target);

  // Step 2: Walk and categorize files
  const { styleFiles, componentFiles, configFiles } = await walkAndCategorize(
    localDir,
    {
      maxFiles: options?.maxFiles ?? 100,
      ignore: options?.ignore,
    },
  );

  const allFiles = [...styleFiles, ...componentFiles, ...configFiles];

  // Step 3: Detect formats
  const detectedFormats = detectFormats(allFiles);

  // Step 4: Normalize tokens
  const normalizedTokens = normalizeTokens(allFiles, detectedFormats);

  // Step 5: Detect framework and component library
  const framework = detectFramework(detectedFormats, localDir);
  const componentLibrary = detectComponentLibrary(localDir);

  return {
    styleFiles,
    componentFiles,
    configFiles,
    metadata: {
      framework,
      componentLibrary,
      tokenCount: normalizedTokens.length,
      componentCount: componentFiles.length,
      targetType: target.type,
      detectedFormats,
      sourceUrl:
        target.type === "url" || target.type === "registry"
          ? target.value
          : undefined,
    },
  };
}

/**
 * Materialize a target to a local directory path.
 * For local paths, returns as-is. For remote targets, fetches to temp dir.
 */
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
      throw new Error(
        "Figma extraction is not yet implemented. Coming soon.",
      );

    case "doc-site":
      // Doc site uses URL materializer with HTML extraction
      return materializeUrl(target.value);

    default:
      throw new Error(`Unsupported target type: ${target.type}`);
  }
}

function detectFramework(
  formats: import("../types.js").DetectedFormat[],
  _cwd: string,
): string | null {
  for (const format of formats) {
    if (format.format === "tailwind-config") return "tailwind";
  }
  if (formats.some((f) => f.format === "css-custom-properties")) return "css";
  if (formats.some((f) => f.format === "style-dictionary"))
    return "style-dictionary";
  if (formats.some((f) => f.format === "w3c-design-tokens"))
    return "w3c-design-tokens";
  return null;
}

function detectComponentLibrary(cwd: string): string | null {
  try {
    const pkgPath = join(cwd, "package.json");
    if (!existsSync(pkgPath)) return null;

    const raw = require("node:fs").readFileSync(pkgPath, "utf-8");
    const pkg = JSON.parse(raw);
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };

    if (allDeps["@shadcn/ui"] || existsSync(join(cwd, "components.json")))
      return "shadcn";
    if (allDeps["@radix-ui/react-slot"]) return "radix";
    if (allDeps["@chakra-ui/react"]) return "chakra";
    if (allDeps["@mui/material"]) return "mui";
    return null;
  } catch {
    return null;
  }
}

export { cssExtractor } from "./css.js";
export { detectFormats } from "./format-detector.js";
export { normalizeTokens } from "./normalizer.js";
export { tailwindExtractor } from "./tailwind.js";
export { walkAndCategorize, walkDirectory } from "./walker.js";
