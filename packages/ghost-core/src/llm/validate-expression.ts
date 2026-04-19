import type { Expression, ExtractedMaterial, LLMConfig } from "../types.js";

export interface ExpressionValidation {
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
 * Validate a deterministic expression against the raw extracted material.
 * Uses heuristic checks to identify potential gaps in the expression.
 *
 * This is a deterministic implementation that doesn't require LLM.
 * When LLM config is provided, it can optionally be enriched with LLM analysis.
 */
export function validateExpression(
  expression: Expression,
  material: ExtractedMaterial,
  _llmConfig?: LLMConfig,
): ExpressionValidation {
  const issues: ValidationIssue[] = [];
  const suggestions: string[] = [];

  // Check: do we have enough semantic colors?
  if (expression.palette.semantic.length < 3) {
    issues.push({
      dimension: "palette",
      severity: "warning",
      message: `Only ${expression.palette.semantic.length} semantic colors detected. Most design systems have 5+.`,
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
    expression.palette.dominant.length +
    expression.palette.semantic.length +
    expression.palette.neutrals.count;
  if (unparsedColorCount > parsedColorCount * 3) {
    issues.push({
      dimension: "palette",
      severity: "info",
      message: `Found ~${unparsedColorCount} color expressions in CSS but only ${parsedColorCount} were captured as tokens.`,
    });
  }

  // Check: spacing scale looks thin
  if (
    expression.spacing.scale.length < 3 &&
    material.metadata.tokenCount > 10
  ) {
    issues.push({
      dimension: "spacing",
      severity: "warning",
      message: `Only ${expression.spacing.scale.length} spacing values detected despite ${material.metadata.tokenCount} total tokens.`,
    });
  }

  // Check: no typography detected
  if (expression.typography.families.length === 0) {
    issues.push({
      dimension: "typography",
      severity: "warning",
      message:
        "No font families detected. Check if font tokens use standard naming.",
    });
  }

  // Check: embedding has too many zero dimensions
  const zeroDims = expression.embedding.filter((v) => v === 0).length;
  if (zeroDims > expression.embedding.length * 0.6) {
    issues.push({
      dimension: "embedding",
      severity: "warning",
      message: `${zeroDims}/${expression.embedding.length} embedding dimensions are zero. Expression may lack discriminative power.`,
    });
    suggestions.push(
      "Consider enriching the expression with more token categories or using semantic embedding.",
    );
  }

  // Check: observation quality (soft checks)
  if (expression.observation) {
    if (!expression.observation.summary) {
      issues.push({
        dimension: "observation",
        severity: "info",
        message: "Observation summary is empty.",
      });
    }
    if (
      expression.observation.personality.length < 2 ||
      expression.observation.personality.length > 8
    ) {
      issues.push({
        dimension: "observation",
        severity: "info",
        message: `Observation has ${expression.observation.personality.length} personality traits (expected 2-6).`,
      });
    }
  }

  // Check: decision quality (soft checks)
  if (expression.decisions && expression.decisions.length > 0) {
    for (const d of expression.decisions) {
      if (!d.dimension || !d.decision) {
        issues.push({
          dimension: "decisions",
          severity: "info",
          message:
            "A design decision is missing its dimension or decision text.",
        });
        break;
      }
      if (!d.evidence || d.evidence.length === 0) {
        issues.push({
          dimension: "decisions",
          severity: "info",
          message: `Decision "${d.dimension}" has no evidence cited.`,
        });
        break;
      }
    }
  } else if (expression.source === "llm") {
    suggestions.push(
      "Expression has no design decisions. Consider using the three-layer agent pipeline for richer analysis.",
    );
  }

  // Compute confidence: 1.0 minus penalty for each issue
  const penalties: Record<string, number> = {
    error: 0.2,
    warning: 0.1,
    info: 0.05,
  };
  const totalPenalty = issues.reduce(
    (sum, issue) => sum + (penalties[issue.severity] ?? 0),
    0,
  );
  const confidence = Math.max(0.1, 1 - totalPenalty);

  return { confidence, issues, suggestions };
}
