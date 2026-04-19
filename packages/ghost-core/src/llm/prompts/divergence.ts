import type { ExpressionComparison } from "../../types.js";

/**
 * Build a prompt for classifying divergence between two design systems.
 */
export function buildDivergencePrompt(
  comparison: ExpressionComparison,
  sourceLabel?: string,
  targetLabel?: string,
): string {
  const dims = Object.entries(comparison.dimensions)
    .filter(([_, d]) => d.distance > 0.05)
    .sort(([, a], [, b]) => b.distance - a.distance)
    .map(
      ([name, d]) => `  ${name}: ${d.distance.toFixed(3)} — ${d.description}`,
    )
    .join("\n");

  return `Classify the divergence between two design systems.

**Source:** ${sourceLabel ?? comparison.source.id}
**Target:** ${targetLabel ?? comparison.target.id}
**Overall distance:** ${comparison.distance.toFixed(3)}

**Divergent dimensions:**
${dims || "  (no significant divergence)"}

## Classification options:
- **accidental-drift**: Unintentional differences — hardcoded values, copy-paste divergence, missed updates
- **intentional-variant**: Coherent, systematic divergence — a density variant, brand customization, or intentional fork
- **evolution-lag**: The parent/source has evolved but the target hasn't caught up
- **incompatible**: Fundamentally different design languages that share little in common

## Task

Respond with a JSON object:
{
  "classification": "one of the four options above",
  "reasoning": "1-2 sentences explaining why",
  "dimensions": {
    "dimension-name": "Per-dimension explanation of what the difference means"
  }
}`;
}
