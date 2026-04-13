import { compareFingerprints } from "../fingerprint/compare.js";
import type {
  DivergenceClass,
  EnrichedComparison,
  FingerprintComparison,
} from "../types.js";
import type { StageContext, StageResult } from "./types.js";

export interface CompareInput {
  source: import("../types.js").DesignFingerprint;
  target: import("../types.js").DesignFingerprint;
  sourceLabel?: string;
  targetLabel?: string;
}

/**
 * Compare two design fingerprints and classify divergence.
 *
 * Runs deterministic comparison (OKLCH distances, Jaccard overlap,
 * methodology matching) and generates per-dimension explanations.
 *
 * No LLM calls — classification and explanations are rule-based.
 */
export async function compare(
  input: CompareInput,
  _ctx?: StageContext,
): Promise<StageResult<EnrichedComparison>> {
  const startTime = Date.now();

  const comparison = compareFingerprints(input.source, input.target, {
    includeVectors: true,
  });

  const classification = classifyDivergence(comparison.distance);
  const explanations = generateExplanations(comparison);

  return {
    data: {
      ...comparison,
      classification,
      explanations,
    },
    confidence: 0.6,
    warnings: [],
    reasoning: [
      `Distance: ${comparison.distance.toFixed(3)}, Classification: ${classification}`,
    ],
    duration: Date.now() - startTime,
  };
}

function classifyDivergence(distance: number): DivergenceClass {
  if (distance < 0.1) return "intentional-variant";
  if (distance < 0.3) return "accidental-drift";
  if (distance < 0.6) return "evolution-lag";
  return "incompatible";
}

function generateExplanations(
  comparison: FingerprintComparison,
): Record<string, string> {
  const explanations: Record<string, string> = {};

  for (const [dim, delta] of Object.entries(comparison.dimensions)) {
    if (delta.distance < 0.05) continue;

    if (delta.distance > 0.5) {
      explanations[dim] =
        `Significant divergence (${delta.distance.toFixed(2)}): ${delta.description}`;
    } else if (delta.distance > 0.2) {
      explanations[dim] =
        `Moderate divergence (${delta.distance.toFixed(2)}): ${delta.description}`;
    } else {
      explanations[dim] =
        `Minor divergence (${delta.distance.toFixed(2)}): ${delta.description}`;
    }
  }

  return explanations;
}
