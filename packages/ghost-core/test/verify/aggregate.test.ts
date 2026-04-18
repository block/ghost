import { describe, expect, it } from "vitest";
import type { ReviewReport } from "../../src/types.js";
import { aggregate, type PromptResult } from "../../src/verify/aggregate.js";
import { loadPromptSuite } from "../../src/verify/suite.js";

function stubReport(byDim: Record<string, number>): ReviewReport {
  const total = Object.values(byDim).reduce((a, b) => a + b, 0);
  return {
    timestamp: "2026-04-17T00:00:00.000Z",
    fingerprint: "fp",
    files: [],
    summary: {
      filesScanned: 1,
      filesWithIssues: total > 0 ? 1 : 0,
      totalIssues: total,
      byDimension: byDim,
      errors: total,
      warnings: 0,
      fixesAvailable: 0,
    },
    duration: 0,
  };
}

function stubResult(
  id: string,
  dims: Array<"palette" | "spacing" | "typography" | "surfaces">,
  review: ReviewReport | undefined,
  passed: boolean,
): PromptResult {
  return {
    id,
    prompt: "x",
    dimensions: dims,
    tier: "core",
    review,
    passed,
    attempts: 1,
    durationMs: 100,
  };
}

describe("aggregate", () => {
  it("classifies tight / leaky / uncaptured by mean", () => {
    const results: PromptResult[] = [
      stubResult("a", ["palette"], stubReport({ palette: 0 }), true),
      stubResult("b", ["palette"], stubReport({ palette: 0 }), true),
      stubResult("c", ["spacing"], stubReport({ spacing: 2 }), false),
      stubResult("d", ["spacing"], stubReport({ spacing: 2 }), false),
      stubResult("e", ["typography"], stubReport({ typography: 5 }), false),
    ];
    const agg = aggregate(results);
    expect(agg.byDimension.palette.classification).toBe("tight");
    expect(agg.byDimension.spacing.classification).toBe("leaky");
    expect(agg.byDimension.typography.classification).toBe("uncaptured");
    expect(agg.byDimension.surfaces.promptsTargetingDimension).toBe(0);
  });

  it("only counts prompts that target a dimension in its mean", () => {
    // palette is targeted only by the first prompt. Others target spacing.
    const results: PromptResult[] = [
      stubResult("a", ["palette"], stubReport({ palette: 4 }), false),
      stubResult(
        "b",
        ["spacing"],
        stubReport({ palette: 10, spacing: 0 }),
        true,
      ),
    ];
    const agg = aggregate(results);
    // palette mean = 4 / 1 = 4 (uncaptured). The unrelated hit in "b" doesn't pull palette's denominator up.
    expect(agg.byDimension.palette.promptsTargetingDimension).toBe(1);
    expect(agg.byDimension.palette.mean).toBe(4);
    expect(agg.byDimension.palette.classification).toBe("uncaptured");
  });

  it("produces passed/failed counts and recommendations", () => {
    const results: PromptResult[] = [
      stubResult("a", ["palette"], stubReport({ palette: 0 }), true),
      stubResult("b", ["spacing"], stubReport({ spacing: 4 }), false),
    ];
    const agg = aggregate(results);
    expect(agg.passed).toBe(1);
    expect(agg.failed).toBe(1);
    const joined = agg.recommendations.join(" | ");
    expect(joined).toContain("spacing");
    expect(joined).toContain("uncaptured");
  });

  it("reports all-tight when nothing drifts", () => {
    const agg = aggregate([
      stubResult("a", ["palette"], stubReport({ palette: 0 }), true),
    ]);
    expect(agg.recommendations[0]).toContain("tight");
  });
});

describe("loadPromptSuite", () => {
  it("loads bundled suite with all core prompts", async () => {
    const suite = await loadPromptSuite();
    expect(suite.version).toBe("0.1");
    expect(suite.prompts.length).toBeGreaterThanOrEqual(15);
    for (const p of suite.prompts) {
      expect(p.id).toBeTruthy();
      expect(p.prompt).toBeTruthy();
      expect(p.dimensions.length).toBeGreaterThan(0);
    }
  });

  it("every bundled prompt uses only valid dimensions", async () => {
    const suite = await loadPromptSuite();
    const valid = new Set(["palette", "spacing", "typography", "surfaces"]);
    for (const p of suite.prompts) {
      for (const d of p.dimensions) {
        expect(valid.has(d)).toBe(true);
      }
    }
  });
});
