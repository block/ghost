import type { CSSToken, SampledMaterial, TokenCategory } from "../types.js";

/**
 * Extract tokens from JSON token files: Style Dictionary, W3C Design Tokens,
 * and Figma Variables format.
 */
export function extractJSONTokenSignals(material: SampledMaterial): CSSToken[] {
  const tokens: CSSToken[] = [];

  for (const file of material.files) {
    if (!file.path.endsWith(".json")) continue;

    try {
      const json = JSON.parse(file.content);

      // W3C Design Tokens format: { $value, $type }
      if (hasW3CTokens(json)) {
        tokens.push(...extractW3CTokens(json, ""));
        continue;
      }

      // Style Dictionary format: nested objects with { value }
      if (hasStyleDictionaryTokens(json)) {
        tokens.push(...extractStyleDictionaryTokens(json, ""));
        continue;
      }
    } catch {
      // Skip invalid JSON
    }
  }

  return tokens;
}

function hasW3CTokens(obj: unknown): boolean {
  if (typeof obj !== "object" || obj === null) return false;
  return Object.values(obj).some(
    (v) =>
      typeof v === "object" &&
      v !== null &&
      ("$value" in v || Object.values(v).some((nested) => typeof nested === "object" && nested !== null && "$value" in nested)),
  );
}

function hasStyleDictionaryTokens(obj: unknown): boolean {
  if (typeof obj !== "object" || obj === null) return false;
  return Object.values(obj).some(
    (v) =>
      typeof v === "object" &&
      v !== null &&
      ("value" in v || Object.values(v).some((nested) => typeof nested === "object" && nested !== null && "value" in nested)),
  );
}

function extractW3CTokens(obj: Record<string, unknown>, prefix: string): CSSToken[] {
  const tokens: CSSToken[] = [];

  for (const [key, val] of Object.entries(obj)) {
    if (key.startsWith("$")) continue;
    const path = prefix ? `${prefix}-${key}` : key;

    if (typeof val === "object" && val !== null) {
      const record = val as Record<string, unknown>;
      if ("$value" in record) {
        const value = String(record.$value);
        const type = String(record.$type ?? "");
        tokens.push({
          name: `--${path}`,
          value,
          selector: ":root",
          category: w3cTypeToCategory(type, path),
          resolvedValue: value,
        });
      } else {
        tokens.push(...extractW3CTokens(record, path));
      }
    }
  }

  return tokens;
}

function extractStyleDictionaryTokens(obj: Record<string, unknown>, prefix: string): CSSToken[] {
  const tokens: CSSToken[] = [];

  for (const [key, val] of Object.entries(obj)) {
    const path = prefix ? `${prefix}-${key}` : key;

    if (typeof val === "object" && val !== null) {
      const record = val as Record<string, unknown>;
      if ("value" in record && (typeof record.value === "string" || typeof record.value === "number")) {
        const value = String(record.value);
        tokens.push({
          name: `--${path}`,
          value,
          selector: ":root",
          category: inferCategoryFromPath(path, value),
          resolvedValue: value,
        });
      } else {
        tokens.push(...extractStyleDictionaryTokens(record, path));
      }
    }
  }

  return tokens;
}

function w3cTypeToCategory(type: string, _path: string): TokenCategory {
  switch (type) {
    case "color": return "color";
    case "dimension": return "spacing";
    case "fontFamily": return "font";
    case "fontWeight": return "typography";
    case "fontSize": return "typography";
    case "lineHeight": return "typography";
    case "shadow": return "shadow";
    case "borderRadius": return "radius";
    case "border": return "border";
    default: return "other";
  }
}

function inferCategoryFromPath(path: string, value: string): TokenCategory {
  const lower = path.toLowerCase();
  if (/color|palette|brand/.test(lower)) return "color";
  if (/spacing|space|gap|size/.test(lower)) return "spacing";
  if (/font-size|fontSize|text-size/.test(lower)) return "typography";
  if (/font-weight|fontWeight/.test(lower)) return "typography";
  if (/font-family|fontFamily|font/.test(lower)) return "font";
  if (/radius|rounded/.test(lower)) return "radius";
  if (/shadow/.test(lower)) return "shadow";
  if (/border/.test(lower)) return "border";

  // Value-based fallback
  if (/^#[0-9a-fA-F]{3,8}$/.test(value)) return "color";
  if (/^(?:rgb|hsl|oklch)\(/.test(value)) return "color";

  return "other";
}
