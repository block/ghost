import { describe, expect, it } from "vitest";
import { extractHtml } from "../../src/generate/parser.js";
import { buildGenerationPrompt } from "../../src/generate/prompts.js";
import type { DesignFingerprint, ReviewReport } from "../../src/types.js";

const FP: DesignFingerprint = {
  id: "fp",
  source: "llm",
  timestamp: "2026-04-17T00:00:00.000Z",
  observation: {
    summary: "Restrained, utilitarian.",
    personality: [],
    distinctiveTraits: ["true-black backgrounds"],
    closestSystems: [],
  },
  decisions: [{ dimension: "color", decision: "Pure black bg.", evidence: [] }],
  values: {
    do: ["Use warm neutrals."],
    dont: ["Don't use drop shadows on cards."],
  },
  palette: {
    dominant: [{ role: "accent", value: "#00d64f" }],
    neutrals: { steps: ["#000", "#fff"], count: 2 },
    semantic: [{ role: "surface", value: "#000" }],
    saturationProfile: "muted",
    contrast: "high",
  },
  spacing: { scale: [4, 8, 16], baseUnit: 8, regularity: 0.9 },
  typography: {
    families: ["Inter"],
    sizeRamp: [14, 16, 24],
    weightDistribution: { 400: 1 },
    lineHeightPattern: "normal",
  },
  surfaces: {
    borderRadii: [8, 16],
    shadowComplexity: "subtle",
    borderUsage: "minimal",
  },
  embedding: [],
};

describe("buildGenerationPrompt", () => {
  it("includes all four layers + tokens + user prompt", () => {
    const p = buildGenerationPrompt({
      fingerprint: FP,
      userPrompt: "Build a pricing page.",
      format: "html",
    });
    expect(p).toContain("## Character");
    expect(p).toContain("## Signature");
    expect(p).toContain("## Decisions");
    expect(p).toContain("## Values");
    expect(p).toContain("## Tokens");
    expect(p).toContain("Build a pricing page.");
    expect(p).toContain("Don't use drop shadows on cards.");
    expect(p).toContain("`surface`: #000");
    expect(p).toContain("Spacing scale:** 4, 8, 16");
  });

  it("injects retry feedback when retryFeedback is passed", () => {
    const review: ReviewReport = {
      timestamp: "2026-04-17T00:00:00.000Z",
      fingerprint: "fp",
      files: [
        {
          file: "artifact.html",
          deepReviewed: true,
          issues: [
            {
              rule: "drift",
              dimension: "palette",
              severity: "error",
              message: "Off-token color",
              file: "artifact.html",
              line: 12,
              found: "#123456",
              phase: "deep",
            },
          ],
        },
      ],
      summary: {
        filesScanned: 1,
        filesWithIssues: 1,
        totalIssues: 1,
        byDimension: { palette: 1 },
        errors: 1,
        warnings: 0,
        fixesAvailable: 0,
      },
      duration: 10,
    };
    const p = buildGenerationPrompt({
      fingerprint: FP,
      userPrompt: "x",
      format: "html",
      retryFeedback: review,
    });
    expect(p).toContain("Previous attempt failed review");
    expect(p).toContain("palette: 1");
    expect(p).toContain("Off-token color");
    expect(p).toContain("#123456");
  });
});

describe("extractHtml", () => {
  it("extracts from an html-tagged fence", () => {
    const text = "Here it is:\n```html\n<!DOCTYPE html><h1>hi</h1>\n```\n";
    expect(extractHtml(text)).toBe("<!DOCTYPE html><h1>hi</h1>");
  });

  it("extracts from an untagged fence", () => {
    const text = "```\n<div>hello</div>\n```";
    expect(extractHtml(text)).toBe("<div>hello</div>");
  });

  it("accepts raw HTML without a fence", () => {
    const text = "<!DOCTYPE html>\n<html><body>x</body></html>";
    expect(extractHtml(text)).toBe(text);
  });

  it("throws when no HTML can be found", () => {
    expect(() => extractHtml("I don't know how to help with that.")).toThrow(
      /Could not extract HTML/,
    );
  });
});
