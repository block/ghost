import { describe, expect, it } from "vitest";
import {
  type GhostChecksDocument,
  type GhostChecksFingerprintContext,
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
        derivation: {
          prose: ["prose.principle:tokenized-ui-color"],
          composition: ["composition.pattern:tokenized-ui-color"],
        },
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

  it("marks derivation refs unverified without fingerprint context", () => {
    const report = lintGhostChecks(checks());

    expect(report.errors).toBe(0);
    expect(report.info).toBe(1);
    expect(report.issues[0]).toMatchObject({
      severity: "info",
      rule: "check-grounding-unverified",
      path: "checks[0].derivation",
    });
  });

  it("requires active checks to declare derivation", () => {
    const report = lintGhostChecks(checks({ derivation: undefined }));

    expect(report.errors).toBe(1);
    expect(report.issues[0]).toMatchObject({
      rule: "check-grounding-missing",
      path: "checks[0].derivation",
    });
  });

  it("accepts active checks grounded in fingerprint refs", () => {
    const report = lintGhostChecks(checks(), {
      fingerprint: fingerprintContext(),
    });

    expect(report.errors).toBe(0);
    expect(report.warnings).toBe(0);
  });

  it("reports active checks grounded in missing fingerprint refs", () => {
    const report = lintGhostChecks(
      checks({
        derivation: {
          prose: ["prose.principle:not-recorded"],
        },
      }),
      {
        fingerprint: fingerprintContext(),
      },
    );

    expect(report.errors).toBe(1);
    expect(report.issues[0]).toMatchObject({
      rule: "check-grounding-unknown",
      path: "checks[0].derivation.prose[0]",
    });
  });

  it("rejects untyped derivation references at schema level", () => {
    const report = lintGhostChecks(
      checks({
        derivation: {
          prose: ["tokenized-ui-color" as never],
        },
      }),
    );

    expect(report.errors).toBe(1);
    expect(report.issues[0]?.rule).toBe("schema/invalid_format");
  });

  it("rejects inventory-only active checks", () => {
    const report = lintGhostChecks(
      checks({
        derivation: {
          inventory: ["inventory.exemplar:lending-tokenized-screen"],
        },
      }),
      { fingerprint: fingerprintContext() },
    );

    expect(report.errors).toBe(1);
    expect(report.issues[0]).toMatchObject({
      rule: "check-grounding-inventory-only",
      path: "checks[0].derivation",
    });
  });

  it("warns for proposed checks with incomplete derivation", () => {
    const report = lintGhostChecks(
      checks({ status: "proposed", derivation: undefined }),
    );

    expect(report.errors).toBe(0);
    expect(report.warnings).toBe(1);
    expect(report.issues[0]).toMatchObject({
      rule: "check-grounding-missing",
      path: "checks[0].derivation",
    });
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
      { fingerprint: fingerprintContext() },
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
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rule: "check-scope-unknown" }),
      ]),
    );
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

function fingerprintContext(): GhostChecksFingerprintContext {
  return {
    prose: {
      principles: [{ id: "tokenized-ui-color" }],
      situations: [],
      experience_contracts: [],
    },
    inventory: {
      topology: {
        scopes: [
          {
            id: "lending",
            surface_types: ["native-feature"],
          },
        ],
        surface_types: ["native-feature"],
      },
      exemplars: [{ id: "lending-tokenized-screen" }],
    },
    composition: {
      patterns: [{ id: "tokenized-ui-color" }],
    },
  };
}
