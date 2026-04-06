import type {
  ExtractedMaterial,
  Extractor,
  ExtractorOptions,
} from "../types.js";
import { cssExtractor } from "./css.js";
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

export { cssExtractor } from "./css.js";
export { tailwindExtractor } from "./tailwind.js";
