import { describe, expect, it } from "vitest";
import {
  type GhostChecksDocument,
  type GhostChecksFingerprintMemory,
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
        derives_from: "principle:tokenized-ui-color",
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

  it("requires active checks to declare derives_from", () => {
    const report = lintGhostChecks(checks({ derives_from: undefined }));

    expect(report.errors).toBe(1);
    expect(report.issues[0]).toMatchObject({
      rule: "check-grounding-missing",
      path: "checks[0].derives_from",
    });
  });

  it("accepts active checks grounded in fingerprint memory", () => {
    const report = lintGhostChecks(checks(), {
      fingerprint: fingerprintMemory(),
    });

    expect(report.errors).toBe(0);
    expect(report.warnings).toBe(0);
  });

  it("reports active checks grounded in missing fingerprint memory", () => {
    const report = lintGhostChecks(
      checks({ derives_from: "principle:not-recorded" }),
      {
        fingerprint: fingerprintMemory(),
      },
    );

    expect(report.errors).toBe(1);
    expect(report.issues[0]).toMatchObject({
      rule: "check-grounding-unknown",
      path: "checks[0].derives_from",
    });
  });

  it("rejects untyped derives_from references at schema level", () => {
    const report = lintGhostChecks(
      checks({ derives_from: "tokenized-ui-color" as never }),
    );

    expect(report.errors).toBe(1);
    expect(report.issues[0]?.rule).toBe("schema/invalid_format");
  });

  it("rejects implementation-only derives_from references at schema level", () => {
    const report = lintGhostChecks(
      checks({ derives_from: "implementation_vocabulary:tokens" as never }),
    );

    expect(report.errors).toBe(1);
    expect(report.issues[0]?.rule).toBe("schema/invalid_format");
  });

  it("fails active checks that reference unknown fingerprint targets", () => {
    const report = lintGhostChecks(
      checks({
        applies_to: {
          scopes: ["unknown-scope"],
          surface_types: ["unknown-surface"],
          pattern_ids: ["unknown-pattern"],
        },
      }),
      { fingerprint: fingerprintMemory() },
    );

    expect(report.errors).toBe(3);
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rule: "check-scope-unknown" }),
        expect.objectContaining({ rule: "check-surface-type-unknown" }),
        expect.objectContaining({ rule: "check-pattern-unknown" }),
      ]),
    );
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

function fingerprintMemory(): GhostChecksFingerprintMemory {
  return {
    topology: {
      scopes: [
        {
          id: "lending",
          surface_types: ["native-feature"],
        },
      ],
      surface_types: ["native-feature"],
    },
    principles: [{ id: "tokenized-ui-color" }],
    situations: [],
    experience_contracts: [],
    patterns: [{ id: "tokenized-ui-color" }],
  };
}
