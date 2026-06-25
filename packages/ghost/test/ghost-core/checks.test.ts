import { describe, expect, it } from "vitest";
import {
  type GhostValidateDocument,
  type GhostValidateFingerprintContext,
  lintGhostValidate,
  routeGhostValidateForPath,
} from "#ghost-core";

function checks(
  overrides: Partial<GhostValidateDocument["checks"][number]> = {},
): GhostValidateDocument {
  return {
    schema: "ghost.validate/v1",
    id: "cash-ios",
    checks: [
      {
        id: "no-hardcoded-ui-color",
        title: "Use design tokens for UI color",
        status: "active",
        severity: "serious",
        derivation: {
          intent: ["intent.principle:tokenized-ui-color"],
          composition: ["composition.pattern:tokenized-ui-color"],
        },
        applies_to: {
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

describe("ghost.validate/v1", () => {
  it("validates an active human-promoted check", () => {
    const report = lintGhostValidate(checks());

    expect(report.errors).toBe(0);
  });

  it("marks derivation refs unverified without fingerprint context", () => {
    const report = lintGhostValidate(checks());

    expect(report.errors).toBe(0);
    expect(report.info).toBe(1);
    expect(report.issues[0]).toMatchObject({
      severity: "info",
      rule: "check-grounding-unverified",
      path: "checks[0].derivation",
    });
  });

  it("warns when active checks do not declare derivation", () => {
    const report = lintGhostValidate(checks({ derivation: undefined }));

    expect(report.errors).toBe(0);
    expect(report.warnings).toBe(1);
    expect(report.issues[0]).toMatchObject({
      severity: "warning",
      rule: "check-grounding-missing",
      path: "checks[0].derivation",
    });
  });

  it("accepts active checks grounded in fingerprint refs", () => {
    const report = lintGhostValidate(checks(), {
      fingerprint: fingerprintContext(),
    });

    expect(report.errors).toBe(0);
    expect(report.warnings).toBe(0);
  });

  it("warns when active checks reference missing fingerprint refs", () => {
    const report = lintGhostValidate(
      checks({
        derivation: {
          intent: ["intent.principle:not-recorded"],
        },
      }),
      {
        fingerprint: fingerprintContext(),
      },
    );

    expect(report.errors).toBe(0);
    expect(report.warnings).toBe(1);
    expect(report.issues[0]).toMatchObject({
      severity: "warning",
      rule: "check-grounding-unknown",
      path: "checks[0].derivation.intent[0]",
    });
  });

  it("rejects untyped derivation references at schema level", () => {
    const report = lintGhostValidate(
      checks({
        derivation: {
          intent: ["tokenized-ui-color" as never],
        },
      }),
    );

    expect(report.errors).toBe(1);
    expect(report.issues[0]?.rule).toBe("schema/invalid_format");
  });

  it("warns on inventory-only active checks", () => {
    const report = lintGhostValidate(
      checks({
        derivation: {
          inventory: ["inventory.exemplar:lending-tokenized-screen"],
        },
      }),
      { fingerprint: fingerprintContext() },
    );

    expect(report.errors).toBe(0);
    expect(report.warnings).toBe(1);
    expect(report.issues[0]).toMatchObject({
      severity: "warning",
      rule: "check-grounding-inventory-only",
      path: "checks[0].derivation",
    });
  });

  it("warns for proposed checks with incomplete derivation", () => {
    const report = lintGhostValidate(
      checks({ status: "proposed", derivation: undefined }),
    );

    expect(report.errors).toBe(0);
    expect(report.warnings).toBe(1);
    expect(report.issues[0]).toMatchObject({
      rule: "check-grounding-missing",
      path: "checks[0].derivation",
    });
  });

  // Phase 3: scope/surface_type check-grounding is dormant (topology removed);
  // rebuilt against surfaces in Phase 4/7. Only pattern_id targets validate.
  it("fails active checks that reference unknown fingerprint pattern targets", () => {
    const report = lintGhostValidate(
      checks({
        applies_to: {
          paths: ["Code/Features/Lending"],
          pattern_ids: ["unknown-pattern"],
        },
      }),
      { fingerprint: fingerprintContext() },
    );

    expect(
      report.issues.some((issue) => issue.rule === "check-pattern-unknown"),
    ).toBe(true);
  });

  it("fails invalid detector regex", () => {
    const report = lintGhostValidate(
      checks({ detector: { type: "forbidden-regex", pattern: "[" } }),
    );

    expect(report.errors).toBe(1);
    expect(report.issues[0].rule).toBe("check-detector-pattern-invalid");
  });

  // Phase 4: map scopes are deleted; routing is path-only. Surface-based
  // routing is rebuilt in Phase 7.
  it("routes checks to a path matching their applies_to.paths", () => {
    const routed = routeGhostValidateForPath(
      checks().checks,
      "Code/Features/Lending/Sources/View.swift",
    );

    expect(routed).toHaveLength(1);
    expect(routed[0].check.id).toBe("no-hardcoded-ui-color");
  });

  it("does not route checks outside their declared paths", () => {
    const routed = routeGhostValidateForPath(
      checks().checks,
      "Code/Features/Investing/Sources/View.swift",
    );

    expect(routed).toEqual([]);
  });
});

function fingerprintContext(): GhostValidateFingerprintContext {
  return {
    intent: {
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
