import type { DetectedFormat, ExtractedFile, TokenFormat } from "../types.js";

/**
 * Detect what token formats are present in a set of extracted files.
 * Returns all detected formats with confidence scores.
 * No AI — pure pattern matching.
 */
export function detectFormats(files: ExtractedFile[]): DetectedFormat[] {
  const formats: DetectedFormat[] = [];

  const cssResult = detectCSSCustomProperties(files);
  if (cssResult) formats.push(cssResult);

  const tailwindResult = detectTailwindConfig(files);
  if (tailwindResult) formats.push(tailwindResult);

  const sdResult = detectStyleDictionary(files);
  if (sdResult) formats.push(sdResult);

  const w3cResult = detectW3CDesignTokens(files);
  if (w3cResult) formats.push(w3cResult);

  const registryResult = detectShadcnRegistry(files);
  if (registryResult) formats.push(registryResult);

  // If nothing detected, return unknown
  if (formats.length === 0) {
    formats.push({
      format: "unknown",
      confidence: 0.1,
      evidence: "No recognized token format found",
      files: [],
    });
  }

  // Sort by confidence descending
  formats.sort((a, b) => b.confidence - a.confidence);

  return formats;
}

function detectCSSCustomProperties(
  files: ExtractedFile[],
): DetectedFormat | null {
  const matchingFiles: string[] = [];
  let totalTokens = 0;

  for (const file of files) {
    if (file.type !== "css" && file.type !== "scss") continue;
    const matches = file.content.match(/--[a-zA-Z][\w-]*\s*:/g);
    if (matches) {
      matchingFiles.push(file.path);
      totalTokens += matches.length;
    }
  }

  if (matchingFiles.length === 0) return null;

  return {
    format: "css-custom-properties",
    confidence: Math.min(0.5 + totalTokens * 0.01, 1.0),
    evidence: `Found ${totalTokens} CSS custom properties in ${matchingFiles.length} file(s)`,
    files: matchingFiles,
  };
}

function detectTailwindConfig(files: ExtractedFile[]): DetectedFormat | null {
  const configFiles = files.filter((f) => f.type === "tailwind-config");

  if (configFiles.length > 0) {
    return {
      format: "tailwind-config",
      confidence: 0.95,
      evidence: `Found Tailwind config: ${configFiles.map((f) => f.path).join(", ")}`,
      files: configFiles.map((f) => f.path),
    };
  }

  // Also check for @tailwind directives in CSS
  const cssWithDirectives: string[] = [];
  for (const file of files) {
    if (file.type !== "css" && file.type !== "scss") continue;
    if (/@tailwind\b|@theme\b|@apply\b/.test(file.content)) {
      cssWithDirectives.push(file.path);
    }
  }

  if (cssWithDirectives.length > 0) {
    return {
      format: "tailwind-config",
      confidence: 0.8,
      evidence: `Found Tailwind directives in ${cssWithDirectives.length} file(s)`,
      files: cssWithDirectives,
    };
  }

  return null;
}

function detectStyleDictionary(files: ExtractedFile[]): DetectedFormat | null {
  const matchingFiles: string[] = [];

  for (const file of files) {
    if (
      file.type !== "json-tokens" &&
      file.type !== "style-dictionary" &&
      file.type !== "config"
    )
      continue;

    try {
      const data = JSON.parse(file.content);
      if (isStyleDictionaryFormat(data)) {
        matchingFiles.push(file.path);
      }
    } catch {
      continue;
    }
  }

  if (matchingFiles.length === 0) return null;

  return {
    format: "style-dictionary",
    confidence: 0.9,
    evidence: `Found Style Dictionary token files: ${matchingFiles.join(", ")}`,
    files: matchingFiles,
  };
}

/**
 * Style Dictionary uses nested objects with `value`/`$value` at leaf nodes.
 * Check if the JSON structure matches.
 */
function isStyleDictionaryFormat(data: unknown): boolean {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return false;
  }

  const obj = data as Record<string, unknown>;

  // Check for $value at any depth (DTCG-compatible Style Dictionary v4+)
  function hasTokenValues(o: Record<string, unknown>, depth = 0): boolean {
    if (depth > 5) return false;
    for (const val of Object.values(o)) {
      if (typeof val !== "object" || val === null) continue;
      const v = val as Record<string, unknown>;
      if ("$value" in v || "value" in v) return true;
      if (hasTokenValues(v, depth + 1)) return true;
    }
    return false;
  }

  return hasTokenValues(obj);
}

function detectW3CDesignTokens(files: ExtractedFile[]): DetectedFormat | null {
  const matchingFiles: string[] = [];

  for (const file of files) {
    if (
      file.type !== "json-tokens" &&
      file.type !== "w3c-tokens" &&
      file.type !== "config"
    )
      continue;

    try {
      const data = JSON.parse(file.content);
      if (isW3CFormat(data)) {
        matchingFiles.push(file.path);
      }
    } catch {
      continue;
    }
  }

  if (matchingFiles.length === 0) return null;

  return {
    format: "w3c-design-tokens",
    confidence: 0.9,
    evidence: `Found W3C Design Token files: ${matchingFiles.join(", ")}`,
    files: matchingFiles,
  };
}

/**
 * W3C Design Tokens (DTCG) have $value + $type, and may have $description, $extensions.
 * Distinguished from generic Style Dictionary by the presence of $type on tokens.
 */
function isW3CFormat(data: unknown): boolean {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return false;
  }

  const obj = data as Record<string, unknown>;
  let hasTypeAndValue = false;

  function check(o: Record<string, unknown>, depth = 0): void {
    if (depth > 5 || hasTypeAndValue) return;
    for (const val of Object.values(o)) {
      if (typeof val !== "object" || val === null) continue;
      const v = val as Record<string, unknown>;
      if ("$value" in v && "$type" in v) {
        hasTypeAndValue = true;
        return;
      }
      check(v, depth + 1);
    }
  }

  check(obj);
  return hasTypeAndValue;
}

function detectShadcnRegistry(files: ExtractedFile[]): DetectedFormat | null {
  for (const file of files) {
    if (file.type !== "config" && file.type !== "json-tokens") continue;

    try {
      const data = JSON.parse(file.content);
      if (
        typeof data === "object" &&
        data !== null &&
        !Array.isArray(data)
      ) {
        const obj = data as Record<string, unknown>;
        // Check for shadcn registry schema marker
        if (
          typeof obj.$schema === "string" &&
          obj.$schema.includes("registry")
        ) {
          return {
            format: "shadcn-registry",
            confidence: 0.95,
            evidence: `Found shadcn registry schema in ${file.path}`,
            files: [file.path],
          };
        }
        // Check for items array with registry types
        if (Array.isArray(obj.items)) {
          const firstItem = obj.items[0] as Record<string, unknown> | undefined;
          if (
            firstItem?.type &&
            typeof firstItem.type === "string" &&
            firstItem.type.startsWith("registry:")
          ) {
            return {
              format: "shadcn-registry",
              confidence: 0.9,
              evidence: `Found registry items with registry: types in ${file.path}`,
              files: [file.path],
            };
          }
        }
      }
    } catch {
      continue;
    }
  }

  return null;
}
