import { existsSync } from "node:fs";
import { join } from "node:path";
import type { CSSToken, TokenCategory } from "../types.js";

const TAILWIND_CONFIG_PATTERNS = [
  "tailwind.config.ts",
  "tailwind.config.js",
  "tailwind.config.mjs",
  "tailwind.config.cjs",
];

/**
 * Resolve a Tailwind CSS config file and extract design tokens.
 * Uses jiti for dynamic TypeScript/ESM loading.
 * Returns CSSToken[] in the same format as CSS parsing, so they can
 * be fed directly into fingerprintFromRegistry.
 */
export async function resolveTailwindConfig(cwd: string): Promise<{
  tokens: CSSToken[];
  configPath: string | null;
}> {
  // Find config file
  let configPath: string | null = null;
  for (const pattern of TAILWIND_CONFIG_PATTERNS) {
    const candidate = join(cwd, pattern);
    if (existsSync(candidate)) {
      configPath = candidate;
      break;
    }
  }

  if (!configPath) return { tokens: [], configPath: null };

  try {
    // Use jiti for runtime loading of TS/ESM/CJS configs
    const { createJiti } = await import("jiti");
    const jiti = createJiti(cwd);
    const config = await jiti.import(configPath, { default: true }) as Record<string, unknown>;

    const tokens: CSSToken[] = [];

    // Extract from theme and theme.extend
    const theme = (config.theme ?? {}) as Record<string, unknown>;
    const extend = (theme.extend ?? {}) as Record<string, unknown>;

    // Merge: extend overrides base theme
    const merged: Record<string, unknown> = { ...theme };
    delete merged.extend;
    for (const [key, value] of Object.entries(extend)) {
      if (typeof value === "object" && value !== null && typeof merged[key] === "object" && merged[key] !== null) {
        merged[key] = { ...(merged[key] as Record<string, unknown>), ...(value as Record<string, unknown>) };
      } else {
        merged[key] = value;
      }
    }

    // Walk theme keys and convert to tokens
    const categoryMap: Record<string, TokenCategory> = {
      colors: "color",
      backgroundColor: "background",
      textColor: "text",
      borderColor: "border",
      spacing: "spacing",
      padding: "spacing",
      margin: "spacing",
      gap: "spacing",
      borderRadius: "radius",
      fontSize: "typography",
      fontWeight: "typography",
      fontFamily: "font",
      lineHeight: "typography",
      letterSpacing: "typography",
      boxShadow: "shadow",
      animation: "animation",
      transitionDuration: "animation",
      transitionTimingFunction: "animation",
    };

    for (const [themeKey, category] of Object.entries(categoryMap)) {
      const values = merged[themeKey];
      if (!values || typeof values !== "object") continue;
      flattenThemeValues(values as Record<string, unknown>, `--tw-${themeKey}`, category, tokens);
    }

    return { tokens, configPath };
  } catch {
    // Config loading failed (missing deps, syntax errors, etc.)
    return { tokens: [], configPath };
  }
}

/**
 * Recursively flatten a Tailwind theme object into CSSTokens.
 * E.g., { primary: { 500: "#fff" } } → --tw-colors-primary-500: #fff
 */
function flattenThemeValues(
  obj: Record<string, unknown>,
  prefix: string,
  category: TokenCategory,
  tokens: CSSToken[],
): void {
  for (const [key, value] of Object.entries(obj)) {
    const name = `${prefix}-${key}`;

    if (typeof value === "string") {
      tokens.push({
        name,
        value,
        selector: "@theme",
        category,
      });
    } else if (typeof value === "number") {
      tokens.push({
        name,
        value: String(value),
        selector: "@theme",
        category,
      });
    } else if (Array.isArray(value)) {
      // Font families are arrays: ["Inter", "sans-serif"]
      tokens.push({
        name,
        value: value.join(", "),
        selector: "@theme",
        category,
      });
    } else if (typeof value === "object" && value !== null) {
      // Nested object: recurse
      flattenThemeValues(value as Record<string, unknown>, name, category, tokens);
    }
  }
}

/**
 * Detect if a project uses Tailwind CSS.
 */
export function detectTailwind(cwd: string): boolean {
  for (const pattern of TAILWIND_CONFIG_PATTERNS) {
    if (existsSync(join(cwd, pattern))) return true;
  }
  return false;
}
