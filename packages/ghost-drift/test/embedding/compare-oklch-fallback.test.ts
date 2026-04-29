import type { Expression } from "@ghost/core";
import { compareExpressions } from "@ghost/core";
import { describe, expect, it } from "vitest";

/**
 * Regression coverage for the oklch fallback in `comparePalette`. Authored
 * expressions can carry palette colors as bare hex (`{ role, value: "#hex" }`)
 * with no `oklch` tuple. Without the fallback, such colors landed in the
 * "unmatched" branch and contributed distance 1 — even when comparing the
 * same expression to itself.
 *
 * Two layers of defense:
 *   - `loadExpression` backfills oklch on read (in ghost-expression).
 *   - `comparePalette` computes oklch on-the-fly when missing AND falls
 *     back to hex equality when even on-the-fly compute can't resolve.
 */

function makeExpression(
  paletteOverrides: Partial<Expression["palette"]> = {},
): Expression {
  return {
    id: "test",
    source: "llm",
    timestamp: "2026-04-29T00:00:00Z",
    palette: {
      dominant: [{ role: "primary", value: "#1a1a1a" }],
      neutrals: { steps: ["#ffffff", "#1a1a1a"], count: 2 },
      semantic: [
        { role: "danger", value: "#f94b4b" },
        { role: "success", value: "#91cb80" },
      ],
      saturationProfile: "muted",
      contrast: "high",
      ...paletteOverrides,
    },
    spacing: { scale: [4, 8, 16], regularity: 1, baseUnit: 4 },
    typography: {
      families: ["Inter"],
      sizeRamp: [12, 16, 24],
      weightDistribution: { 400: 1 },
      lineHeightPattern: "normal",
    },
    surfaces: {
      borderRadii: [4, 8],
      shadowComplexity: "deliberate-none",
      borderUsage: "minimal",
    },
    embedding: [],
  };
}

describe("comparePalette — oklch missing fallback", () => {
  it("self-comparison of hex-only palette returns distance 0", () => {
    const expr = makeExpression();
    const result = compareExpressions(expr, expr);
    expect(result.dimensions.palette.distance).toBe(0);
  });

  it("identical hex-only palettes (different objects) return distance 0", () => {
    const a = makeExpression();
    const b = makeExpression();
    const result = compareExpressions(a, b);
    expect(result.dimensions.palette.distance).toBe(0);
  });

  it("different hex-only palettes return non-zero distance", () => {
    const a = makeExpression();
    const b = makeExpression({
      dominant: [{ role: "primary", value: "#0066cc" }],
    });
    const result = compareExpressions(a, b);
    expect(result.dimensions.palette.distance).toBeGreaterThan(0);
  });

  it("hex-only on one side, oklch-populated on the other still matches when value is identical", () => {
    const a = makeExpression();
    const b = makeExpression({
      dominant: [
        { role: "primary", value: "#1a1a1a", oklch: [0.218, 0, 89.9] },
      ],
    });
    const result = compareExpressions(a, b);
    // The on-the-fly parse should resolve a's hex to roughly the same
    // oklch — distance should be near 0, not 1.
    expect(result.dimensions.palette.distance).toBeLessThan(0.01);
  });

  it("hex-only colors that are non-parseable but identical strings still match", () => {
    const a = makeExpression({
      dominant: [{ role: "primary", value: "var(--upstream-brand)" }],
    });
    const b = makeExpression({
      dominant: [{ role: "primary", value: "var(--upstream-brand)" }],
    });
    const result = compareExpressions(a, b);
    // CSS vars don't parse to oklch — fall through to hex equality.
    expect(result.dimensions.palette.distance).toBe(0);
  });
});
