import { describe, expect, it } from "vitest";
import {
  type GhostChecksDocument,
  lintGhostChecks,
  type MapFrontmatter,
  routeGhostChecksForPath,
} from "../src/index.js";

const MAP: Pick<MapFrontmatter, "scopes" | "feature_areas"> = {
  feature_areas: [],
  scopes: [
    {
      id: "lending",
      name: "Lending",
      kind: "product-surface",
      paths: ["Code/Features/Lending"],
    },
    {
      id: "investing",
      name: "Investing",
      kind: "product-surface",
      paths: ["Code/Features/Investing"],
    },
  ],
};

function checks(
  overrides: Partial<GhostChecksDocument["checks"][number]> = {},
): GhostChecksDocument {
  return {
    schema: "ghost.checks/v1",
    id: "cash-ios",
    checks: [
      {
        id: "no-hardcoded-ui-color",
        title: "Use design tokens for UI color",
        status: "active",
        severity: "serious",
        applies_to: {
          scopes: ["lending"],
          paths: ["Code/Features/Lending"],
        },
        detector: {
          type: "forbidden-regex",
          pattern: "#[0-9a-fA-F]{3,8}",
          contexts: ["swift"],
        },
        evidence: {
          support: 0.94,
          observed_count: 47,
          examples: ["Code/Features/Lending/LendingUI"],
        },
        repair: "Replace literals with Arcade/Cash semantic tokens.",
        ...overrides,
      },
    ],
  };
}

describe("ghost.checks/v1", () => {
  it("validates an active human-promoted check", () => {
    const report = lintGhostChecks(checks(), { map: MAP });

    expect(report.errors).toBe(0);
  });

  it("fails invalid detector regex", () => {
    const report = lintGhostChecks(
      checks({ detector: { type: "forbidden-regex", pattern: "[" } }),
      { map: MAP },
    );

    expect(report.errors).toBe(1);
    expect(report.issues[0].rule).toBe("check-detector-pattern-invalid");
  });

  it("fails active checks that reference unknown scopes", () => {
    const report = lintGhostChecks(
      checks({ applies_to: { scopes: ["banking"] } }),
      { map: MAP },
    );

    expect(report.errors).toBe(1);
    expect(report.issues[0].rule).toBe("check-scope-unknown");
  });

  it("routes path-scoped checks through map scopes", () => {
    const routed = routeGhostChecksForPath(
      checks().checks,
      MAP,
      "Code/Features/Lending/Sources/View.swift",
    );

    expect(routed).toHaveLength(1);
    expect(routed[0].check.id).toBe("no-hardcoded-ui-color");
    expect(routed[0].matched_scopes[0].id).toBe("lending");
  });

  it("does not route checks outside their declared scope", () => {
    const routed = routeGhostChecksForPath(
      checks().checks,
      MAP,
      "Code/Features/Investing/Sources/View.swift",
    );

    expect(routed).toEqual([]);
  });
});
