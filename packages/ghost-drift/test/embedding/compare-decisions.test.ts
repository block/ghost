import type { DesignDecision, Expression } from "@ghost/core";
import { compareExpressions } from "@ghost/core";
import { describe, expect, it } from "vitest";

/**
 * Minimal expression skeleton — identical palette/spacing/typography/surfaces
 * across fixtures so only the decisions layer affects the compare output.
 */
function baseExpression(
  id: string,
  decisions: DesignDecision[] = [],
): Expression {
  return {
    id,
    source: "llm",
    timestamp: "2026-04-16T00:00:00.000Z",
    decisions,
    palette: {
      dominant: [{ role: "primary", value: "#000", oklch: [0, 0, 0] }],
      neutrals: { steps: ["#fff", "#000"], count: 2 },
      semantic: [{ role: "text", value: "#000", oklch: [0, 0, 0] }],
      saturationProfile: "muted",
      contrast: "high",
    },
    spacing: { scale: [4, 8, 16], regularity: 1, baseUnit: 4 },
    typography: {
      families: ["Inter"],
      sizeRamp: [14, 16, 24],
      weightDistribution: { 400: 1 },
      lineHeightPattern: "normal",
    },
    surfaces: {
      borderRadii: [4, 8],
      shadowComplexity: "none",
      borderUsage: "minimal",
    },
  };
}

/** Make a unit vector biased toward a named "concept" index. Used to simulate
 *  that paraphrased decisions produce embeddings close in cosine space. */
function conceptVector(concept: number, dims = 8, jitter = 0): number[] {
  const v = new Array(dims).fill(0.1);
  v[concept] = 1 + jitter;
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  return v.map((x) => x / norm);
}

describe("compareExpressions — decisions", () => {
  it("paraphrased decisions match when embeddings are close", () => {
    // Two expressions describe the same design decision with different words,
    // but the embeddings (simulated here) cluster near the same concept index.
    const a = baseExpression("a", [
      {
        dimension: "color-strategy",
        decision: "Achromatic chrome with chromatic accents",
        evidence: ["--color-accent: oklch(0.55 0.2 250)"],
        embedding: conceptVector(0, 8, 0.01),
      },
      {
        dimension: "spatial-system",
        decision: "Strict 4px base grid",
        evidence: ["--space-1: 4px"],
        embedding: conceptVector(1, 8, 0.01),
      },
    ]);

    const b = baseExpression("b", [
      {
        dimension: "color-usage",
        decision: "Neutral UI, saturated accents only",
        evidence: ["accent-color: #3b82f6"],
        embedding: conceptVector(0, 8, -0.01),
      },
      {
        dimension: "spacing-scale",
        decision: "Four-pixel spacing atom",
        evidence: ["spacing.1 = 4"],
        embedding: conceptVector(1, 8, -0.01),
      },
    ]);

    const result = compareExpressions(a, b);
    const decisionsDim = result.dimensions.decisions;

    expect(decisionsDim).toBeDefined();
    expect(decisionsDim.distance).toBeLessThan(0.1);
    expect(decisionsDim.description).toMatch(/align closely/i);
  });

  it("unrelated decisions score as divergent", () => {
    const a = baseExpression("a", [
      {
        dimension: "color-strategy",
        decision: "Achromatic chrome",
        evidence: [],
        embedding: conceptVector(0),
      },
      {
        dimension: "motion",
        decision: "No animation",
        evidence: [],
        embedding: conceptVector(1),
      },
    ]);

    const b = baseExpression("b", [
      {
        dimension: "density",
        decision: "Generous whitespace",
        evidence: [],
        embedding: conceptVector(4),
      },
      {
        dimension: "elevation",
        decision: "Heavy shadow hierarchy",
        evidence: [],
        embedding: conceptVector(5),
      },
    ]);

    const result = compareExpressions(a, b);
    expect(result.dimensions.decisions.distance).toBeGreaterThan(0.5);
    expect(result.dimensions.decisions.description).toMatch(
      /fundamentally|divergence/i,
    );
  });

  it("missing embeddings: decisions recorded but not scored", () => {
    // Decisions exist on both sides but neither has embeddings (pre-embedding
    // expression or no embedding provider was configured). The dimension
    // should be reported qualitatively and contribute 0 to the weighted score.
    const a = baseExpression("a", [
      { dimension: "color-strategy", decision: "X", evidence: [] },
    ]);
    const b = baseExpression("b", [
      { dimension: "color-strategy", decision: "Y", evidence: [] },
    ]);

    const result = compareExpressions(a, b);
    expect(result.dimensions.decisions.distance).toBe(0);
    expect(result.dimensions.decisions.description).toMatch(/not scored/i);

    // Overall distance should match what you'd get with no decisions at all
    // (since other dimensions are identical, overall distance should be ~0).
    expect(result.distance).toBeLessThan(0.01);
  });

  it("no decisions on either side: decisions dimension absent", () => {
    const a = baseExpression("a", []);
    const b = baseExpression("b", []);

    const result = compareExpressions(a, b);
    expect(result.dimensions.decisions).toBeUndefined();
  });
});
