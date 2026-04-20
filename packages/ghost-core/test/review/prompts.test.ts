import { describe, expect, it } from "vitest";
import { buildReviewPrompt } from "../../src/review/prompts.js";
import type { Expression } from "../../src/types.js";

const BASE: Expression = {
  id: "test",
  source: "llm",
  timestamp: "2026-04-17T00:00:00.000Z",
  palette: {
    dominant: [{ role: "primary", value: "#000000" }],
    neutrals: { steps: ["#ffffff", "#000000"], count: 2 },
    semantic: [],
    saturationProfile: "muted",
    contrast: "high",
  },
  spacing: { scale: [4, 8, 16], baseUnit: 4, regularity: 1 },
  typography: {
    families: ["Inter"],
    sizeRamp: [12, 16, 24],
    weightDistribution: { 400: 1 },
    lineHeightPattern: "normal",
  },
  surfaces: {
    borderRadii: [8],
    shadowComplexity: "subtle",
    borderUsage: "moderate",
  },
  embedding: [],
};

const FILES = [{ path: "src/Button.tsx", content: "<button/>" }];

describe("buildReviewPrompt — signature injection", () => {
  it("injects signature traits and tells the LLM they outrank value mismatches", () => {
    const fp: Expression = {
      ...BASE,
      observation: {
        summary: "Warm, editorial.",
        personality: [],
        distinctiveTraits: [
          "Warm ring-shadows instead of drops",
          "Editorial serif/sans split",
        ],
        closestSystems: [],
      },
    };
    const prompt = buildReviewPrompt(fp, FILES);
    expect(prompt).toContain("Signature moves");
    expect(prompt).toContain("Warm ring-shadows instead of drops");
    expect(prompt).toContain("signature violation");
  });

  it("omits the signature section when the expression has none", () => {
    const prompt = buildReviewPrompt(BASE, FILES);
    expect(prompt).not.toContain("Signature moves");
  });
});
