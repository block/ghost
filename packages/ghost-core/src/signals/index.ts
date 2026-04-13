import {
  classifyContrast,
  classifySaturation,
  colorToSemanticColor,
} from "../fingerprint/colors.js";
import { inferSemanticRole } from "../fingerprint/semantic-roles.js";
import type { CSSToken, DesignFingerprint, SampledMaterial, SemanticColor } from "../types.js";
import { extractComponentSignals } from "./components.js";
import { extractCSSSignals } from "./css.js";
import { extractJSONTokenSignals } from "./json-tokens.js";
import { extractSwiftSignals } from "./swift.js";
import type { DeterministicSignals, SignalCoverage } from "./types.js";

export type { DeterministicSignals, SignalCoverage } from "./types.js";

/**
 * Extract all deterministic signals from sampled material.
 *
 * Combines CSS, JSON token, Swift, and component analysis into
 * structured signals that the LLM can validate and complete.
 */
export function extractSignals(material: SampledMaterial): DeterministicSignals {
  // Extract tokens from each source type
  const cssTokens = extractCSSSignals(material);
  const jsonTokens = extractJSONTokenSignals(material);
  const swiftResult = extractSwiftSignals(material);
  const componentResult = extractComponentSignals(material);

  // Merge all tokens
  const allTokens = [...cssTokens, ...jsonTokens, ...swiftResult.tokens];

  // Build partial fingerprint from tokens
  const partial = buildPartialFingerprint(allTokens);

  // Compute coverage
  const coverage = computeCoverage(partial);

  // Determine what the LLM should focus on
  const llmFocusAreas: string[] = [];
  if (coverage.colors < 0.5) llmFocusAreas.push("palette");
  if (coverage.spacing < 0.5) llmFocusAreas.push("spacing");
  if (coverage.typography < 0.5) llmFocusAreas.push("typography");
  if (coverage.surfaces < 0.5) llmFocusAreas.push("surfaces");
  if (coverage.architecture < 0.5) llmFocusAreas.push("architecture");

  // Merge methodology signals
  const methodologySignals = [
    ...new Set([
      ...swiftResult.methodologySignals,
      ...componentResult.methodologySignals,
    ]),
  ];

  return {
    tokens: allTokens,
    partial,
    coverage,
    llmFocusAreas,
    methodologySignals,
    componentNames: componentResult.componentNames,
  };
}

// --- Partial fingerprint construction ---

function buildPartialFingerprint(tokens: CSSToken[]): Partial<DesignFingerprint> {
  const partial: Partial<DesignFingerprint> = {};

  // Colors
  const semanticColors = extractSemanticColors(tokens);
  const dominantColors = extractDominantColors(tokens, semanticColors);
  if (semanticColors.length > 0 || dominantColors.length > 0) {
    partial.palette = {
      dominant: dominantColors,
      neutrals: { steps: [], count: 0 },
      semantic: semanticColors,
      saturationProfile: classifySaturation([...dominantColors, ...semanticColors]),
      contrast: classifyContrast([...dominantColors, ...semanticColors]),
    };
  }

  // Spacing
  const spacingValues = extractNumericTokens(tokens, "spacing");
  if (spacingValues.length > 0) {
    const scale = [...new Set(spacingValues)].sort((a, b) => a - b);
    const diffs = scale.slice(1).map((v, i) => v - scale[i]);
    const baseUnit = diffs.length > 0 ? Math.min(...diffs.filter((d) => d > 0)) : null;

    partial.spacing = {
      scale,
      regularity: scoreRegularity(scale),
      baseUnit: baseUnit && baseUnit > 0 ? baseUnit : null,
    };
  }

  // Typography
  const fontFamilies = tokens
    .filter((t) => t.category === "font")
    .map((t) => t.resolvedValue ?? t.value)
    .filter((v) => /[a-zA-Z]/.test(v) && !v.startsWith("var("));
  const fontSizes = extractNumericTokens(tokens, "typography");
  if (fontFamilies.length > 0 || fontSizes.length > 0) {
    const weights: Record<number, number> = {};
    for (const t of tokens) {
      if (t.category === "typography" && (t.name.includes("weight") || t.name.includes("Weight"))) {
        const num = Number.parseFloat(t.resolvedValue ?? t.value);
        if (!Number.isNaN(num) && num >= 100 && num <= 900) {
          weights[num] = (weights[num] ?? 0) + 1;
        }
      }
    }

    partial.typography = {
      families: [...new Set(fontFamilies)],
      sizeRamp: [...new Set(fontSizes)].sort((a, b) => a - b),
      weightDistribution: weights,
      lineHeightPattern: "normal",
    };
  }

  // Surfaces
  const radii = extractNumericTokens(tokens, "radius");
  if (radii.length > 0) {
    const shadowTokens = tokens.filter((t) => t.category === "shadow");
    partial.surfaces = {
      borderRadii: [...new Set(radii)].sort((a, b) => a - b),
      shadowComplexity: shadowTokens.length === 0 ? "none" : shadowTokens.some((t) => (t.resolvedValue ?? t.value).includes(",")) ? "layered" : "subtle",
      borderUsage: "minimal",
    };
  }

  return partial;
}

function extractSemanticColors(tokens: CSSToken[]): SemanticColor[] {
  const colors: SemanticColor[] = [];
  const seen = new Set<string>();

  for (const token of tokens) {
    const value = token.resolvedValue ?? token.value;
    const candidate = inferSemanticRole(token.name, value);
    if (candidate && !seen.has(candidate.role)) {
      seen.add(candidate.role);
      colors.push(colorToSemanticColor(candidate.role, value));
    }
  }

  return colors;
}

function extractDominantColors(tokens: CSSToken[], semantic: SemanticColor[]): SemanticColor[] {
  const dominantRoles = ["primary", "secondary", "accent", "destructive", "danger"];
  return semantic.filter((c) => dominantRoles.includes(c.role));
}

function extractNumericTokens(tokens: CSSToken[], category: string): number[] {
  const values: number[] = [];
  for (const token of tokens) {
    if (token.category === category) {
      const val = token.resolvedValue ?? token.value;
      // Parse px, rem, or plain numbers
      let num = Number.parseFloat(val);
      if (!Number.isNaN(num)) {
        if (val.includes("rem")) num *= 16;
        values.push(num);
      }
    }
  }
  return values;
}

function scoreRegularity(scale: number[]): number {
  if (scale.length < 3) return scale.length === 2 ? 0.8 : 0;
  const ratios = scale.slice(1).map((v, i) => (scale[i] > 0 ? v / scale[i] : 0)).filter((r) => r > 0);
  if (ratios.length === 0) return 0;
  const mean = ratios.reduce((a, b) => a + b, 0) / ratios.length;
  if (mean === 0) return 0;
  const variance = ratios.reduce((sum, v) => sum + (v - mean) ** 2, 0) / ratios.length;
  const cv = Math.sqrt(variance) / mean;
  return Math.max(0.3, Math.min(1, 1 - cv));
}

function computeCoverage(partial: Partial<DesignFingerprint>): SignalCoverage {
  return {
    colors: partial.palette
      ? Math.min(1, (partial.palette.dominant.length + partial.palette.semantic.length) / 5)
      : 0,
    spacing: partial.spacing
      ? Math.min(1, partial.spacing.scale.length / 5)
      : 0,
    typography: partial.typography
      ? Math.min(1, (partial.typography.families.length + partial.typography.sizeRamp.length) / 5)
      : 0,
    surfaces: partial.surfaces
      ? Math.min(1, partial.surfaces.borderRadii.length / 3)
      : 0,
    architecture: 0, // Always needs LLM for tokenization scoring
  };
}
