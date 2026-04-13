import { parseCSS } from "../resolvers/css.js";
import type {
  DetectedFormat,
  ExtractedFile,
  NormalizedToken,
  TokenCategory,
} from "../types.js";

/**
 * Normalize tokens from extracted files based on detected formats.
 * Delegates to format-specific parsers, all producing NormalizedToken[].
 */
export function normalizeTokens(
  files: ExtractedFile[],
  formats: DetectedFormat[],
): NormalizedToken[] {
  const tokens: NormalizedToken[] = [];
  const processedFiles = new Set<string>();

  for (const format of formats) {
    switch (format.format) {
      case "css-custom-properties": {
        for (const file of files) {
          if (
            (file.type !== "css" && file.type !== "scss") ||
            processedFiles.has(file.path)
          )
            continue;

          const cssTokens = parseCSS(file.content);
          for (const token of cssTokens) {
            tokens.push({
              ...token,
              originalFormat: "css-custom-properties",
              sourceFile: file.path,
            });
          }
          processedFiles.add(file.path);
        }
        break;
      }

      case "style-dictionary": {
        for (const filePath of format.files) {
          if (processedFiles.has(filePath)) continue;
          const file = files.find((f) => f.path === filePath);
          if (!file) continue;

          try {
            const data = JSON.parse(file.content);
            const sdTokens = parseStyleDictionary(data, file.path);
            tokens.push(...sdTokens);
            processedFiles.add(filePath);
          } catch {
            continue;
          }
        }
        break;
      }

      case "w3c-design-tokens": {
        for (const filePath of format.files) {
          if (processedFiles.has(filePath)) continue;
          const file = files.find((f) => f.path === filePath);
          if (!file) continue;

          try {
            const data = JSON.parse(file.content);
            const w3cTokens = parseW3CTokens(data, file.path);
            tokens.push(...w3cTokens);
            processedFiles.add(filePath);
          } catch {
            continue;
          }
        }
        break;
      }

      // tailwind-config and shadcn-registry are handled by existing resolvers
      // (resolvers/tailwind.ts and resolvers/registry.ts) — not duplicated here
      case "tailwind-config":
      case "shadcn-registry":
      case "figma-variables":
      case "unknown":
        break;
    }
  }

  return tokens;
}

/**
 * Parse Style Dictionary format into normalized tokens.
 * Style Dictionary uses nested objects: { color: { primary: { value: "#000" } } }
 */
function parseStyleDictionary(
  data: unknown,
  sourceFile: string,
  prefix = "",
): NormalizedToken[] {
  const tokens: NormalizedToken[] = [];

  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return tokens;
  }

  const obj = data as Record<string, unknown>;

  for (const [key, val] of Object.entries(obj)) {
    if (key.startsWith("$")) continue; // Skip meta keys

    if (typeof val !== "object" || val === null) continue;

    const v = val as Record<string, unknown>;
    const tokenName = prefix ? `--${prefix}-${key}` : `--${key}`;

    // Leaf node: has $value or value
    const value = v.$value ?? v.value;
    if (value !== undefined && (typeof value === "string" || typeof value === "number")) {
      const strValue = String(value);
      const type = (v.$type ?? v.type) as string | undefined;
      const category = typeToCategory(type, key, strValue);

      tokens.push({
        name: tokenName,
        value: strValue,
        selector: ":root",
        category,
        originalFormat: "style-dictionary",
        sourceFile,
      });
    } else {
      // Recurse into nested groups
      const nested = parseStyleDictionary(
        val,
        sourceFile,
        prefix ? `${prefix}-${key}` : key,
      );
      tokens.push(...nested);
    }
  }

  return tokens;
}

/**
 * Parse W3C Design Tokens (DTCG) format.
 * Similar to Style Dictionary but tokens have $value + $type.
 */
function parseW3CTokens(
  data: unknown,
  sourceFile: string,
  prefix = "",
): NormalizedToken[] {
  const tokens: NormalizedToken[] = [];

  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return tokens;
  }

  const obj = data as Record<string, unknown>;

  for (const [key, val] of Object.entries(obj)) {
    if (key.startsWith("$")) continue;

    if (typeof val !== "object" || val === null) continue;

    const v = val as Record<string, unknown>;
    const tokenName = prefix ? `--${prefix}-${key}` : `--${key}`;

    if ("$value" in v) {
      const value = v.$value;
      const strValue = typeof value === "object" ? JSON.stringify(value) : String(value);
      const type = v.$type as string | undefined;
      const category = typeToCategory(type, key, strValue);

      tokens.push({
        name: tokenName,
        value: strValue,
        selector: ":root",
        category,
        originalFormat: "w3c-design-tokens",
        sourceFile,
      });
    } else {
      const nested = parseW3CTokens(
        val,
        sourceFile,
        prefix ? `${prefix}-${key}` : key,
      );
      tokens.push(...nested);
    }
  }

  return tokens;
}

/**
 * Map a token $type to our internal TokenCategory.
 */
function typeToCategory(
  type: string | undefined,
  name: string,
  value: string,
): TokenCategory {
  if (type) {
    const t = type.toLowerCase();
    if (t === "color") return "color";
    if (t === "dimension" || t === "spacing") return "spacing";
    if (t === "fontfamily" || t === "fontweight" || t === "fontsize")
      return "typography";
    if (t === "borderradius") return "radius";
    if (t === "shadow" || t === "boxshadow") return "shadow";
    if (t === "border") return "border";
    if (t === "duration" || t === "transition") return "animation";
    if (t === "typography" || t === "lineheight" || t === "letterspacing")
      return "typography";
  }

  // Fallback: infer from name
  const n = name.toLowerCase();
  if (n.includes("color") || n.includes("bg") || n.includes("background"))
    return "color";
  if (n.includes("spacing") || n.includes("gap") || n.includes("margin") || n.includes("padding"))
    return "spacing";
  if (n.includes("font") || n.includes("text") || n.includes("type"))
    return "typography";
  if (n.includes("radius") || n.includes("rounded")) return "radius";
  if (n.includes("shadow")) return "shadow";
  if (n.includes("border")) return "border";

  // Fallback: infer from value
  if (/^#|^rgb|^hsl|^oklch/.test(value)) return "color";

  return "other";
}
