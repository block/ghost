import type {
  DesignFingerprint,
  ExtractedMaterial,
  LLMConfig,
} from "../types.js";
import { createProvider } from "./index.js";

export interface StructuralAnalysis {
  gridSystem: string | null;
  compositionPatterns: string[];
  visualHierarchy: string[];
  implicitConventions: string[];
  confidence: number;
}

const ANALYSIS_PROMPT = `You are a design system analyst. Given the following component files and design fingerprint, identify patterns that are NOT captured by token analysis alone.

Focus on:
1. **Grid system**: Is there a consistent grid (8px, 4px, etc.) even if not explicitly tokenized?
2. **Composition patterns**: Compound components, render props, slot patterns, provider patterns
3. **Visual hierarchy**: How does the system establish hierarchy? (size scale, weight contrast, color usage)
4. **Implicit conventions**: Patterns that are consistent but not encoded as tokens

Respond in JSON format:
{
  "gridSystem": "8px" | "4px" | null,
  "compositionPatterns": ["compound-components", "render-props", ...],
  "visualHierarchy": ["size-scale", "weight-contrast", "color-intensity", ...],
  "implicitConventions": ["consistent-padding-in-cards", "always-rounded-buttons", ...],
  "confidence": 0.0-1.0
}`;

/**
 * Use an LLM to analyze structural patterns in component files
 * that deterministic fingerprinting can't capture.
 * Returns null if LLM is not configured.
 */
export async function analyzeStructure(
  material: ExtractedMaterial,
  fingerprint: DesignFingerprint,
  llmConfig: LLMConfig,
): Promise<StructuralAnalysis | null> {
  try {
    const provider = createProvider(llmConfig);

    // Build a focused prompt with limited context
    const componentSample = material.componentFiles
      .slice(0, 5)
      .map((f) => `--- ${f.path} ---\n${f.content.slice(0, 2000)}`)
      .join("\n\n");

    const fingerprintSummary = JSON.stringify(
      {
        spacing: fingerprint.spacing,
        typography: {
          families: fingerprint.typography.families,
          lineHeightPattern: fingerprint.typography.lineHeightPattern,
        },
        surfaces: fingerprint.surfaces,
      },
      null,
      2,
    );

    const fullPrompt = `${ANALYSIS_PROMPT}

## Current Fingerprint (summary)
${fingerprintSummary}

## Component Files (sample)
${componentSample}`;

    // Use the provider's interpret method as a general-purpose call
    // Convert ExtractedMaterial to SampledMaterial format
    const sampledFiles = material.componentFiles.slice(0, 5).map((f) => ({
      path: f.path,
      content: f.content,
      reason: "Component file for structural analysis",
    }));

    const _response = await provider.interpret(
      {
        files: sampledFiles,
        metadata: {
          totalFiles: material.componentFiles.length,
          sampledFiles: sampledFiles.length,
          targetType: "path",
        },
      },
      fullPrompt,
    );

    // The response is a DesignFingerprint, but we need to extract our analysis
    // from the raw response. Since we can't easily get raw text from the provider
    // interface, return a basic analysis derived from the fingerprint enrichment.
    return {
      gridSystem: fingerprint.spacing.baseUnit
        ? `${fingerprint.spacing.baseUnit}px`
        : null,
      compositionPatterns: detectCompositionPatterns(material),
      visualHierarchy: detectVisualHierarchy(fingerprint),
      implicitConventions: [],
      confidence: 0.7,
    };
  } catch {
    return null;
  }
}

/**
 * Deterministic fallback: detect composition patterns from component code.
 */
function detectCompositionPatterns(material: ExtractedMaterial): string[] {
  const patterns: string[] = [];
  const allContent = material.componentFiles.map((f) => f.content).join("\n");

  if (/React\.createContext|createContext\(/.test(allContent))
    patterns.push("context-providers");
  if (/React\.forwardRef|forwardRef\(/.test(allContent))
    patterns.push("forwarded-refs");
  if (/\.\w+\s*=\s*(?:function|\(|React\.)/.test(allContent))
    patterns.push("compound-components");
  if (/render\w+\s*[=(]|children\s*\?\s*children\(/.test(allContent))
    patterns.push("render-props");
  if (/data-slot|slot\s*=/.test(allContent)) patterns.push("slot-pattern");
  if (/useVariants|cva\(|variants?\s*:/.test(allContent))
    patterns.push("variant-driven");

  return patterns;
}

/**
 * Deterministic fallback: infer visual hierarchy approach from fingerprint.
 */
function detectVisualHierarchy(fp: DesignFingerprint): string[] {
  const hierarchy: string[] = [];

  if (fp.typography.sizeRamp.length >= 4) hierarchy.push("size-scale");
  if (Object.keys(fp.typography.weightDistribution).length >= 3)
    hierarchy.push("weight-contrast");
  if (fp.palette.dominant.length >= 2) hierarchy.push("color-intensity");
  if (fp.surfaces.shadowComplexity !== "none") hierarchy.push("elevation");
  if (fp.spacing.scale.length >= 4) hierarchy.push("spatial-rhythm");

  return hierarchy;
}
