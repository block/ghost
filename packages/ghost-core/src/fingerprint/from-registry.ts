import type {
  ColorRamp,
  CSSToken,
  DesignFingerprint,
  ResolvedRegistry,
  SemanticColor,
} from "../types.js";
import {
  classifyContrast,
  classifySaturation,
  colorToSemanticColor,
} from "./colors.js";
import { computeEmbedding } from "./embedding.js";

const SEMANTIC_ROLES: Record<string, string> = {
  "--background-default": "surface",
  "--background-alt": "surface-alt",
  "--background-accent": "accent",
  "--text-default": "text",
  "--text-muted": "text-muted",
  "--text-inverse": "text-inverse",
  "--text-danger": "danger",
  "--border-default": "border",
  "--border-strong": "border-strong",
};

function resolveTokenValue(token: CSSToken): string {
  return token.resolvedValue ?? token.value;
}

function extractSemanticColors(tokens: CSSToken[]): SemanticColor[] {
  const colors: SemanticColor[] = [];
  for (const token of tokens) {
    const role = SEMANTIC_ROLES[token.name];
    if (role) {
      colors.push(colorToSemanticColor(role, resolveTokenValue(token)));
    }
  }
  return colors;
}

function extractDominantColors(tokens: CSSToken[]): SemanticColor[] {
  // Dominant = non-neutral, non-text semantic colors
  const dominantRoles = ["accent", "danger"];
  const all = extractSemanticColors(tokens);
  const dominant = all.filter((c) => dominantRoles.includes(c.role));
  // If no explicit dominant, use first non-neutral color
  if (dominant.length === 0 && all.length > 0) {
    return [all[0]];
  }
  return dominant;
}

function extractNeutralRamp(tokens: CSSToken[]): ColorRamp {
  const grayTokens = tokens
    .filter(
      (t) =>
        t.name.startsWith("--color-gray-") ||
        t.name === "--color-white" ||
        t.name === "--color-black",
    )
    .map((t) => resolveTokenValue(t))
    .filter((v) => !v.startsWith("var("));

  return { steps: grayTokens, count: grayTokens.length };
}

function extractSpacing(tokens: CSSToken[]): {
  scale: number[];
  regularity: number;
  baseUnit: number | null;
} {
  const spacingValues: number[] = [];
  for (const token of tokens) {
    if (token.category === "spacing") {
      const num = Number.parseFloat(resolveTokenValue(token));
      if (!Number.isNaN(num)) spacingValues.push(num);
    }
  }

  spacingValues.sort((a, b) => a - b);
  const unique = [...new Set(spacingValues)];

  // Detect base unit (GCD-like)
  let baseUnit: number | null = null;
  if (unique.length >= 2) {
    const diffs = unique.slice(1).map((v, i) => v - unique[i]);
    const minDiff = Math.min(...diffs.filter((d) => d > 0));
    if (minDiff > 0) baseUnit = minDiff;
  }

  // Regularity: how well does the scale follow a consistent step pattern?
  let regularity = 0;
  if (baseUnit && unique.length >= 2) {
    const expectedSteps = unique.map((v) => Math.round(v / baseUnit));
    const isRegular = expectedSteps.every(
      (s, i) =>
        i === 0 ||
        s === expectedSteps[i - 1] + 1 ||
        s === expectedSteps[i - 1] * 2,
    );
    regularity = isRegular ? 1 : 0.5;
  }

  return { scale: unique, regularity, baseUnit };
}

function extractBorderRadii(tokens: CSSToken[]): number[] {
  const radii: number[] = [];
  for (const token of tokens) {
    if (token.category === "radius") {
      const num = Number.parseFloat(resolveTokenValue(token));
      if (!Number.isNaN(num)) radii.push(num);
    }
  }
  return [...new Set(radii)].sort((a, b) => a - b);
}

function classifyShadowComplexity(
  tokens: CSSToken[],
): "none" | "subtle" | "layered" {
  const shadowTokens = tokens.filter((t) => t.category === "shadow");
  if (shadowTokens.length === 0) return "none";

  const hasMultipleLayers = shadowTokens.some((t) => {
    const val = resolveTokenValue(t);
    // Count comma-separated shadow layers
    return val.split(",").length > 1;
  });

  return hasMultipleLayers ? "layered" : "subtle";
}

function extractTypography(tokens: CSSToken[]): {
  families: string[];
  sizeRamp: number[];
  weightDistribution: Record<number, number>;
} {
  const families: string[] = [];
  const sizes: number[] = [];
  const weights: Record<number, number> = {};

  for (const token of tokens) {
    if (token.category === "font") {
      const val = resolveTokenValue(token);
      if (
        token.name.includes("family") ||
        (/[a-zA-Z]/.test(val) && !val.startsWith("var("))
      ) {
        families.push(val);
      }
    }
    if (token.category === "typography") {
      const num = Number.parseFloat(resolveTokenValue(token));
      if (!Number.isNaN(num)) {
        if (token.name.includes("weight")) {
          weights[num] = (weights[num] ?? 0) + 1;
        } else {
          sizes.push(num);
        }
      }
    }
  }

  return {
    families: [...new Set(families)],
    sizeRamp: [...new Set(sizes)].sort((a, b) => a - b),
    weightDistribution: weights,
  };
}

export function fingerprintFromRegistry(
  registry: ResolvedRegistry,
): DesignFingerprint {
  const tokens = registry.tokens;
  const rootTokens = tokens.filter(
    (t) => t.selector === ":root" || t.selector === "@theme",
  );

  const semanticColors = extractSemanticColors(rootTokens);
  const allColors = [...semanticColors, ...extractDominantColors(tokens)];

  const uiItems = registry.items.filter((i) => i.type === "registry:ui");
  const categories: Record<string, number> = {};
  for (const item of uiItems) {
    for (const cat of item.categories ?? ["uncategorized"]) {
      categories[cat] = (categories[cat] ?? 0) + 1;
    }
  }

  const typography = extractTypography(tokens);
  const spacing = extractSpacing(tokens);

  const fingerprint: Omit<DesignFingerprint, "embedding"> = {
    id: registry.name,
    source: "registry",
    timestamp: new Date().toISOString(),

    palette: {
      dominant: extractDominantColors(tokens),
      neutrals: extractNeutralRamp(tokens),
      semantic: semanticColors,
      saturationProfile: classifySaturation(allColors),
      contrast: classifyContrast(allColors),
    },

    spacing,

    typography: {
      families: typography.families,
      sizeRamp: typography.sizeRamp,
      weightDistribution: typography.weightDistribution,
      lineHeightPattern: "normal", // default for registry
    },

    surfaces: {
      borderRadii: extractBorderRadii(tokens),
      shadowComplexity: classifyShadowComplexity(tokens),
      borderUsage:
        tokens.filter((t) => t.category === "border").length > 3
          ? "heavy"
          : tokens.filter((t) => t.category === "border").length > 0
            ? "moderate"
            : "minimal",
    },

    architecture: {
      tokenization: 1, // registry is fully tokenized by definition
      methodology: ["css-custom-properties"],
      componentCount: uiItems.length,
      componentCategories: categories,
      namingPattern: detectNamingPattern(uiItems.map((i) => i.name)),
    },
  };

  return {
    ...fingerprint,
    embedding: computeEmbedding(fingerprint),
  };
}

function detectNamingPattern(names: string[]): string {
  if (names.length === 0) return "unknown";

  const allKebab = names.every((n) => /^[a-z][a-z0-9-]*$/.test(n));
  const allCamel = names.every((n) => /^[a-z][a-zA-Z0-9]*$/.test(n));
  const allPascal = names.every((n) => /^[A-Z][a-zA-Z0-9]*$/.test(n));

  if (allKebab) return "kebab-case";
  if (allPascal) return "PascalCase";
  if (allCamel) return "camelCase";
  return "mixed";
}
