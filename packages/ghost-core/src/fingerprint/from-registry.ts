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
import { inferSemanticRole } from "./semantic-roles.js";

function resolveTokenValue(token: CSSToken): string {
  return token.resolvedValue ?? token.value;
}

function resolveSemanticRole(
  tokenName: string,
  tokenValue?: string,
): string | null {
  const candidate = inferSemanticRole(tokenName, tokenValue);
  return candidate ? candidate.role : null;
}

function extractSemanticColors(tokens: CSSToken[]): SemanticColor[] {
  const colors: SemanticColor[] = [];
  const seen = new Set<string>();
  for (const token of tokens) {
    const value = resolveTokenValue(token);
    const role = resolveSemanticRole(token.name, value);
    if (role && !seen.has(role)) {
      seen.add(role);
      colors.push(colorToSemanticColor(role, value));
    }
  }
  return colors;
}

/**
 * Sigmoid weight for chroma-based dominant color detection.
 * Produces a soft boundary around 0.04 instead of a hard cutoff.
 * At 0.03 → 0.27, at 0.04 → 0.5, at 0.05 → 0.73
 */
function chromaWeight(chroma: number): number {
  return 1 / (1 + Math.exp(-50 * (chroma - 0.04)));
}

function extractDominantColors(tokens: CSSToken[]): SemanticColor[] {
  // Dominant = brand, accent, primary, destructive — not neutral/text/border/surface roles
  const dominantRoles = [
    "primary",
    "secondary",
    "accent",
    "destructive",
    "danger",
    "ring",
  ];
  const neutralPrefixes = ["surface", "text", "border", "muted"];
  const all = extractSemanticColors(tokens);

  // Score each color: explicit dominant role = 1.0, otherwise use chroma weight
  const scored = all
    .map((c) => {
      if (dominantRoles.includes(c.role)) return { color: c, score: 1 };
      if (neutralPrefixes.some((p) => c.role.startsWith(p)))
        return { color: c, score: 0 };
      const weight = c.oklch ? chromaWeight(c.oklch[1]) : 0;
      return { color: c, score: weight };
    })
    .filter((s) => s.score > 0.3) // soft threshold: include colors with >= 30% confidence
    .sort((a, b) => b.score - a.score);

  const dominant = scored.map((s) => s.color);

  // If no dominant, use first non-neutral color
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

/**
 * Compute coefficient of variation for an array of numbers.
 */
function coefficientOfVariation(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) return 0;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance) / mean;
}

/**
 * Score how regular a spacing scale is.
 * Recognizes linear, geometric, Fibonacci, and golden ratio progressions.
 */
function scoreSpacingRegularity(scale: number[]): number {
  if (scale.length < 3) return scale.length === 2 ? 0.8 : 0;

  const diffs = scale.slice(1).map((v, i) => v - scale[i]);
  const ratios = scale
    .slice(1)
    .map((v, i) => (scale[i] > 0 ? v / scale[i] : 0))
    .filter((r) => r > 0);

  if (ratios.length === 0) return 0;

  const diffCV = coefficientOfVariation(diffs);
  const ratioCV = coefficientOfVariation(ratios);

  // Linear: constant difference (CV of diffs < 0.15)
  if (diffCV < 0.15) return 1.0;

  // Geometric: constant ratio (CV of ratios < 0.15)
  if (ratioCV < 0.15) return 1.0;

  // Fibonacci-like: each value ≈ sum of two previous (within 10%)
  if (scale.length >= 3) {
    const fibScores: boolean[] = [];
    for (let i = 2; i < scale.length; i++) {
      const expected = scale[i - 1] + scale[i - 2];
      fibScores.push(Math.abs(scale[i] - expected) / expected < 0.1);
    }
    if (fibScores.every(Boolean)) return 1.0;
    if (fibScores.filter(Boolean).length / fibScores.length > 0.7) return 0.8;
  }

  // Golden ratio: ratios ≈ 1.618 (within 15%)
  const goldenRatio = 1.618;
  const goldenScores = ratios.map(
    (r) => Math.abs(r - goldenRatio) / goldenRatio < 0.15,
  );
  if (goldenScores.every(Boolean)) return 1.0;
  if (goldenScores.filter(Boolean).length / goldenScores.length > 0.7)
    return 0.8;

  // Near-linear or near-geometric
  if (diffCV < 0.3) return 0.8;
  if (ratioCV < 0.3) return 0.8;

  // Partial regularity based on ratio consistency
  return Math.max(0.3, Math.min(0.7, 1 - ratioCV));
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

  const regularity = scoreSpacingRegularity(unique);

  return { scale: unique, regularity, baseUnit };
}

function classifyLineHeight(tokens: CSSToken[]): "tight" | "normal" | "loose" {
  const lineHeightValues: number[] = [];
  for (const token of tokens) {
    if (
      token.category === "typography" &&
      (token.name.includes("line-height") || token.name.includes("leading"))
    ) {
      const val = resolveTokenValue(token);
      const num = Number.parseFloat(val);
      if (!Number.isNaN(num)) {
        // Unitless values (1.2, 1.5) or percentage-like
        // Values > 3 are likely px — normalize against a 16px base
        lineHeightValues.push(num > 3 ? num / 16 : num);
      }
    }
  }

  if (lineHeightValues.length === 0) return "normal";

  const avg =
    lineHeightValues.reduce((a, b) => a + b, 0) / lineHeightValues.length;
  if (avg < 1.3) return "tight";
  if (avg > 1.7) return "loose";
  return "normal";
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

/**
 * Build a fingerprint deterministically from a resolved registry.
 *
 * This produces the values layer only — observation and decisions require
 * LLM analysis and are not available for deterministic fingerprints.
 */
export function fingerprintFromRegistry(
  registry: ResolvedRegistry,
): DesignFingerprint {
  const tokens = registry.tokens;
  const rootTokens = tokens.filter(
    (t) => t.selector === ":root" || t.selector === "@theme",
  );

  const semanticColors = extractSemanticColors(rootTokens);
  const allColors = [...semanticColors, ...extractDominantColors(tokens)];

  const typography = extractTypography(tokens);
  const spacing = extractSpacing(tokens);
  const borderTokenCount = tokens.filter((t) => t.category === "border").length;

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
      lineHeightPattern: classifyLineHeight(tokens),
    },

    surfaces: {
      borderRadii: extractBorderRadii(tokens),
      shadowComplexity: classifyShadowComplexity(tokens),
      borderUsage:
        borderTokenCount > 3
          ? "heavy"
          : borderTokenCount > 0
            ? "moderate"
            : "minimal",
      borderTokenCount,
    },
  };

  return {
    ...fingerprint,
    embedding: computeEmbedding(fingerprint),
  };
}
