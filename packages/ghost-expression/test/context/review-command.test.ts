import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { Expression } from "@ghost/core";
import { describe, expect, it } from "vitest";
import { emitReviewCommand } from "../../src/core/context/review-command.js";
import { loadExpression } from "../../src/core/index.js";

const GHOST_UI_EXPRESSION = fileURLToPath(
  new URL("../../../ghost-ui/expression.md", import.meta.url),
);

describe("emitReviewCommand", () => {
  it("produces a stable artifact for the ghost-ui expression", async () => {
    const parsed = await loadExpression(GHOST_UI_EXPRESSION, {
      noEmbeddingBackfill: true,
    });
    const out = emitReviewCommand({ expression: parsed.expression });

    expect(out).toMatchSnapshot();
  });

  it("opens with the description frontmatter and an H1 role prompt", () => {
    const fp = minimalExpression();
    const out = emitReviewCommand({ expression: fp });

    expect(out.startsWith("---\ndescription: Drift review for ")).toBe(true);
    expect(out).toMatch(/^# minimal drift review$/m);
    expect(out).toMatch(/\$ARGUMENTS/);
  });

  it("includes only true semantic hues in the serious rules table", () => {
    const fp = minimalExpression();
    fp.palette.semantic = [
      { role: "danger", value: "#ff0000" },
      { role: "surface-muted", value: "#f5f5f5" },
      { role: "text-alt", value: "#666666" },
    ];
    const out = emitReviewCommand({ expression: fp });

    expect(out).toMatch(/\| danger must use the semantic token \| `#ff0000`/);
    expect(out).not.toMatch(/surface-muted must use the semantic token/);
    expect(out).not.toMatch(/text-alt must use the semantic token/);
  });

  it("elides the Serious palette table when no true semantic hues exist", () => {
    const fp = minimalExpression();
    fp.palette.semantic = [{ role: "surface-muted", value: "#f5f5f5" }];
    const out = emitReviewCommand({ expression: fp });

    expect(out).not.toMatch(/^### Serious$/m);
  });

  it("drops universal sections when the expression has no data for them", () => {
    const fp = minimalExpression();
    fp.surfaces.borderRadii = [];
    fp.spacing.scale = [];
    const out = emitReviewCommand({ expression: fp });

    expect(out).not.toMatch(/Shape language/);
    expect(out).not.toMatch(/Spacing drift/);
    expect(out).toMatch(/Typography drift/);
  });

  it("inlines the Character paragraph when observation.summary is present", () => {
    const fp = minimalExpression();
    fp.observation = {
      summary: "A spartan, monospaced system driven by code-native aesthetics.",
      personality: ["spartan", "monospaced"],
      distinctiveTraits: [],
      resembles: [],
    };
    const out = emitReviewCommand({ expression: fp });

    expect(out).toMatch(/A spartan, monospaced system/);
    expect(out).toMatch(/reads as \*spartan, monospaced\*/);
  });

  it("omits covered dimensions from the Other dimensions section", () => {
    const fp = minimalExpression();
    fp.decisions = [
      {
        dimension: "color-strategy",
        decision: "Use color sparingly.",
        evidence: [],
      },
      {
        dimension: "elevation",
        decision: "Name shadows by role, not intensity.",
        evidence: [],
      },
    ];
    const out = emitReviewCommand({ expression: fp });

    // color-strategy appears as the palette rationale, not in "Other dimensions"
    expect(out).toMatch(/> Use color sparingly\./);
    expect(out).toMatch(/## 5\. Other dimensions/);
    expect(out).toMatch(/### elevation/);
    // The color-strategy heading should not appear in Other dimensions block
    const otherBlock = out.split("## 5. Other dimensions")[1] ?? "";
    expect(otherBlock).not.toMatch(/### color-strategy/);
  });

  it("discovers the spike output ran against a real expression", async () => {
    // Smoke: the file exists and parses, otherwise the first test would also
    // fail with a less obvious error.
    const raw = await readFile(GHOST_UI_EXPRESSION, "utf-8");
    expect(raw).toMatch(/^---/);
  });
});

function minimalExpression(): Expression {
  return {
    id: "minimal",
    source: "llm",
    timestamp: "2026-04-19T00:00:00.000Z",
    palette: {
      dominant: [{ role: "primary", value: "#000000" }],
      neutrals: { steps: ["#ffffff", "#000000"], count: 2 },
      semantic: [],
      saturationProfile: "muted",
      contrast: "high",
    },
    spacing: { scale: [4, 8, 16], baseUnit: 4, regularity: 1 },
    typography: {
      families: ["Inter, sans-serif"],
      sizeRamp: [12, 16, 24],
      weightDistribution: { 400: 1, 600: 0.5 },
      lineHeightPattern: "normal",
    },
    surfaces: {
      borderRadii: [8, 999],
      shadowComplexity: "subtle",
      borderUsage: "moderate",
    },
    embedding: [],
  };
}
