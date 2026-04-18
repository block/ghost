import type { ReviewReport } from "../types.js";
import type { SuiteDimension } from "./suite.js";

export type DriftClassification = "tight" | "leaky" | "uncaptured";

/** Per-dimension rollup. */
export interface DimensionRollup {
  /** How many prompts in the run exercised this dimension. */
  promptsTargetingDimension: number;
  /** Total issue count for this dimension across all prompts. */
  total: number;
  /** Mean issues per prompt that targeted this dimension. */
  mean: number;
  /** Max issues observed on a single prompt for this dimension. */
  max: number;
  /**
   * tight (mean < 1): expression holds under generation.
   * leaky (1 <= mean < 3): generator drifts here often; consider tightening Decisions.
   * uncaptured (mean >= 3): expression likely under-specifies this dimension.
   */
  classification: DriftClassification;
}

export interface PromptResult {
  id: string;
  prompt: string;
  dimensions: SuiteDimension[];
  tier: "core" | "stress";
  /** Undefined when generation or review failed. */
  review?: ReviewReport;
  passed: boolean;
  attempts: number;
  errorMessage?: string;
  durationMs: number;
}

export interface VerifyAggregate {
  promptCount: number;
  passed: number;
  failed: number;
  byDimension: Record<SuiteDimension, DimensionRollup>;
  byPrompt: PromptResult[];
  recommendations: string[];
}

const DIMENSIONS: SuiteDimension[] = [
  "palette",
  "spacing",
  "typography",
  "surfaces",
];

export function aggregate(results: PromptResult[]): VerifyAggregate {
  const byDimension = {} as Record<SuiteDimension, DimensionRollup>;

  for (const dim of DIMENSIONS) {
    const targeted = results.filter((r) => r.dimensions.includes(dim));
    const counts = targeted.map((r) => r.review?.summary.byDimension[dim] ?? 0);
    const total = counts.reduce((a, b) => a + b, 0);
    const mean = targeted.length ? total / targeted.length : 0;
    const max = counts.length ? Math.max(...counts) : 0;
    byDimension[dim] = {
      promptsTargetingDimension: targeted.length,
      total,
      mean: round2(mean),
      max,
      classification: classify(mean),
    };
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;

  return {
    promptCount: results.length,
    passed,
    failed,
    byDimension,
    byPrompt: results,
    recommendations: buildRecommendations(byDimension),
  };
}

function classify(mean: number): DriftClassification {
  if (mean < 1) return "tight";
  if (mean < 3) return "leaky";
  return "uncaptured";
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function buildRecommendations(
  byDimension: Record<SuiteDimension, DimensionRollup>,
): string[] {
  const recs: string[] = [];
  for (const dim of DIMENSIONS) {
    const r = byDimension[dim];
    if (r.promptsTargetingDimension === 0) continue;
    if (r.classification === "uncaptured") {
      recs.push(
        `${dim}: drift mean ${r.mean} (uncaptured). Expression likely under-specifies this dimension — add more Decisions or Values rules, or tighten token scales.`,
      );
    } else if (r.classification === "leaky") {
      recs.push(
        `${dim}: drift mean ${r.mean} (leaky). Generator drifts here often. Consider adding a Values rule or a specific Decision to anchor ${dim}.`,
      );
    }
  }
  if (recs.length === 0) {
    recs.push(
      "All targeted dimensions are tight. Expression reproduces faithfully under generation.",
    );
  }
  return recs;
}

export interface FormatOptions {
  showPrompts?: boolean;
}

export function formatVerifyCLI(
  agg: VerifyAggregate,
  options: FormatOptions = {},
): string {
  const lines: string[] = [];
  lines.push(
    `Ran ${agg.promptCount} prompt${agg.promptCount === 1 ? "" : "s"} — ${agg.passed} passed, ${agg.failed} failed.`,
  );
  lines.push("");
  lines.push("Drift by dimension:");
  for (const dim of DIMENSIONS) {
    const r = agg.byDimension[dim];
    if (r.promptsTargetingDimension === 0) {
      lines.push(`  ${dim.padEnd(12)} (not targeted by any prompt)`);
      continue;
    }
    lines.push(
      `  ${dim.padEnd(12)} mean ${String(r.mean).padStart(5)} · max ${String(r.max).padStart(3)} · ${r.classification}`,
    );
  }
  lines.push("");
  lines.push("Recommendations:");
  for (const rec of agg.recommendations) lines.push(`  • ${rec}`);

  if (options.showPrompts) {
    lines.push("");
    lines.push("Per-prompt results:");
    for (const p of agg.byPrompt) {
      const status = p.passed ? "✓" : "✗";
      const errs = p.review?.summary.errors ?? 0;
      const warns = p.review?.summary.warnings ?? 0;
      lines.push(
        `  ${status} ${p.id.padEnd(24)} attempts=${p.attempts} errors=${errs} warnings=${warns}${p.errorMessage ? `  [${p.errorMessage}]` : ""}`,
      );
    }
  }

  return lines.join("\n");
}
