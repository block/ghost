import type {
  DesignFingerprint,
  ExtractedMaterial,
  LLMConfig,
} from "../types.js";

export interface FingerprintValidation {
  confidence: number;
  issues: ValidationIssue[];
  suggestions: string[];
}

export interface ValidationIssue {
  dimension: string;
  severity: "info" | "warning" | "error";
  message: string;
}

/**
 * Validate a deterministic fingerprint against the raw extracted material.
 * Uses heuristic checks to identify potential gaps in the fingerprint.
 *
 * This is a deterministic implementation that doesn't require LLM.
 * When LLM config is provided, it can optionally be enriched with LLM analysis.
 */
export function validateFingerprint(
  fingerprint: DesignFingerprint,
  material: ExtractedMaterial,
  _llmConfig?: LLMConfig,
): FingerprintValidation {
  const issues: ValidationIssue[] = [];
  const suggestions: string[] = [];

  // Check: do we have enough semantic colors?
  if (fingerprint.palette.semantic.length < 3) {
    issues.push({
      dimension: "palette",
      severity: "warning",
      message: `Only ${fingerprint.palette.semantic.length} semantic colors detected. Most design systems have 5+.`,
    });
    suggestions.push(
      "Check if token naming conventions match the semantic role detection patterns.",
    );
  }

  // Check: are there unparsed colors in the CSS?
  const colorPatterns = /(?:hsl|rgb|oklch|#[0-9a-f])\(/gi;
  let unparsedColorCount = 0;
  for (const file of material.styleFiles) {
    const matches = file.content.match(colorPatterns);
    if (matches) unparsedColorCount += matches.length;
  }
  const parsedColorCount =
    fingerprint.palette.dominant.length +
    fingerprint.palette.semantic.length +
    fingerprint.palette.neutrals.count;
  if (unparsedColorCount > parsedColorCount * 3) {
    issues.push({
      dimension: "palette",
      severity: "info",
      message: `Found ~${unparsedColorCount} color expressions in CSS but only ${parsedColorCount} were captured as tokens.`,
    });
  }

  // Check: spacing scale looks thin
  if (fingerprint.spacing.scale.length < 3 && material.metadata.tokenCount > 10) {
    issues.push({
      dimension: "spacing",
      severity: "warning",
      message: `Only ${fingerprint.spacing.scale.length} spacing values detected despite ${material.metadata.tokenCount} total tokens.`,
    });
  }

  // Check: no typography detected
  if (fingerprint.typography.families.length === 0) {
    issues.push({
      dimension: "typography",
      severity: "warning",
      message: "No font families detected. Check if font tokens use standard naming.",
    });
  }

  // Check: embedding has too many zero dimensions
  const zeroDims = fingerprint.embedding.filter((v) => v === 0).length;
  if (zeroDims > fingerprint.embedding.length * 0.6) {
    issues.push({
      dimension: "embedding",
      severity: "warning",
      message: `${zeroDims}/${fingerprint.embedding.length} embedding dimensions are zero. Fingerprint may lack discriminative power.`,
    });
    suggestions.push(
      "Consider enriching the fingerprint with more token categories or using semantic embedding.",
    );
  }

  // Compute confidence: 1.0 minus penalty for each issue
  const penalties: Record<string, number> = { error: 0.2, warning: 0.1, info: 0.05 };
  const totalPenalty = issues.reduce(
    (sum, issue) => sum + (penalties[issue.severity] ?? 0),
    0,
  );
  const confidence = Math.max(0.1, 1 - totalPenalty);

  return { confidence, issues, suggestions };
}
