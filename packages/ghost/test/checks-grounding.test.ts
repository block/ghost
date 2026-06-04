import { describe, expect, it } from "vitest";
import {
  GHOST_CHECKS_SCHEMA,
  GHOST_FINGERPRINT_SCHEMA,
  type GhostChecksDocument,
  type GhostFingerprintDocument,
  lintGhostChecks,
} from "../src/ghost-core/index.js";

describe("ghost.checks/v2 grounding", () => {
  it("requires active checks to declare derivation", () => {
    const doc = checksDocument({
      derivation: undefined,
    });

    const report = lintGhostChecks(doc);

    expect(report.errors).toBe(1);
    expect(report.issues[0]).toMatchObject({
      rule: "check-grounding-missing",
      path: "checks[0].derivation",
    });
  });

  it("accepts active checks grounded in prose memory", () => {
    const report = lintGhostChecks(checksDocument(), {
      fingerprint: fingerprintDocument(),
    });

    expect(report.errors).toBe(0);
    expect(report.warnings).toBe(0);
  });

  it("marks derivation refs unverified without fingerprint context", () => {
    const report = lintGhostChecks(checksDocument());

    expect(report.errors).toBe(0);
    expect(report.info).toBe(1);
    expect(report.issues[0]).toMatchObject({
      severity: "info",
      rule: "check-grounding-unverified",
      path: "checks[0].derivation",
    });
  });

  it("accepts active checks grounded in composition memory", () => {
    const report = lintGhostChecks(
      checksDocument({
        derivation: {
          composition: ["composition.pattern:tokenized-ui-color"],
        },
      }),
      { fingerprint: fingerprintDocument() },
    );

    expect(report.errors).toBe(0);
    expect(report.warnings).toBe(0);
  });

  it("accepts active checks with inventory as supporting derivation", () => {
    const report = lintGhostChecks(
      checksDocument({
        derivation: {
          prose: ["prose.principle:dense-workflows-prioritize-scanning"],
          inventory: ["inventory.exemplar:orders-table"],
        },
      }),
      { fingerprint: fingerprintDocument() },
    );

    expect(report.errors).toBe(0);
    expect(report.warnings).toBe(0);
  });

  it("rejects inventory-only derivation for active checks", () => {
    const report = lintGhostChecks(
      checksDocument({
        derivation: {
          inventory: ["inventory.exemplar:orders-table"],
        },
      }),
      { fingerprint: fingerprintDocument() },
    );

    expect(report.errors).toBe(1);
    expect(report.issues[0]).toMatchObject({
      rule: "check-grounding-inventory-only",
      path: "checks[0].derivation",
    });
  });

  it("accepts active checks scoped to known fingerprint topology", () => {
    const report = lintGhostChecks(
      checksDocument({
        applies_to: {
          scopes: ["lending"],
          surface_types: ["native-feature"],
          pattern_ids: ["tokenized-ui-color"],
        },
      }),
      {
        fingerprint: fingerprintDocument({
          inventory: {
            topology: {
              scopes: [
                {
                  id: "lending",
                  paths: ["Code/Features/Lending"],
                  surface_types: ["native-feature"],
                },
              ],
              surface_types: ["native-feature"],
            },
            building_blocks: {},
            exemplars: [],
          },
        }),
      },
    );

    expect(report.errors).toBe(0);
    expect(report.warnings).toBe(0);
  });

  it("reports active checks grounded in missing fingerprint.yml prose/inventory/composition", () => {
    const doc = checksDocument({
      derivation: {
        prose: ["prose.principle:missing-principle"],
      },
    });

    const report = lintGhostChecks(doc, {
      fingerprint: fingerprintDocument(),
    });

    expect(report.errors).toBe(1);
    expect(report.issues[0]).toMatchObject({
      rule: "check-grounding-unknown",
      path: "checks[0].derivation.prose[0]",
    });
  });

  it("reports active checks scoped to unknown fingerprint targets", () => {
    const report = lintGhostChecks(
      checksDocument({
        applies_to: {
          scopes: ["unknown-scope"],
          surface_types: ["unknown-surface"],
          pattern_ids: ["unknown-pattern"],
        },
      }),
      { fingerprint: fingerprintDocument() },
    );

    expect(report.errors).toBe(3);
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rule: "check-scope-unknown",
          path: "checks[0].applies_to.scopes[0]",
        }),
        expect.objectContaining({
          rule: "check-surface-type-unknown",
          path: "checks[0].applies_to.surface_types[0]",
        }),
        expect.objectContaining({
          rule: "check-pattern-unknown",
          path: "checks[0].applies_to.pattern_ids[0]",
        }),
      ]),
    );
  });

  it("downgrades proposed check target misses to warnings", () => {
    const report = lintGhostChecks(
      checksDocument({
        status: "proposed",
        applies_to: {
          scopes: ["unknown-scope"],
        },
      }),
      { fingerprint: fingerprintDocument() },
    );

    expect(report.errors).toBe(0);
    expect(report.warnings).toBe(1);
    expect(report.issues[0]).toMatchObject({
      rule: "check-scope-unknown",
    });
  });

  it("downgrades proposed check grounding misses to warnings", () => {
    const doc = checksDocument({
      status: "proposed",
      derivation: {
        prose: ["prose.principle:missing-principle"],
      },
    });

    const report = lintGhostChecks(doc, {
      fingerprint: fingerprintDocument(),
    });

    expect(report.errors).toBe(0);
    expect(report.warnings).toBe(1);
    expect(report.issues[0]).toMatchObject({
      rule: "check-grounding-unknown",
    });
  });

  it("downgrades missing proposed derivation to a warning", () => {
    const doc = checksDocument({
      status: "proposed",
      derivation: undefined,
    });

    const report = lintGhostChecks(doc);

    expect(report.errors).toBe(0);
    expect(report.warnings).toBe(1);
    expect(report.issues[0]).toMatchObject({
      rule: "check-grounding-missing",
    });
  });

  it("rejects untyped derivation references at schema level", () => {
    const doc = checksDocument({
      derivation: {
        prose: ["dense-workflows-prioritize-scanning"] as never,
      },
    });

    const report = lintGhostChecks(doc);

    expect(report.errors).toBe(1);
    expect(report.issues[0]?.rule).toBe("schema/invalid_format");
  });

  it("rejects mismatched derivation references at schema level", () => {
    const doc = checksDocument({
      derivation: {
        inventory: ["composition.pattern:tokenized-ui-color"] as never,
      },
    });

    const report = lintGhostChecks(doc);

    expect(report.errors).toBe(1);
    expect(report.issues[0]?.rule).toBe("schema/invalid_format");
  });
});

function checksDocument(
  overrides: Partial<GhostChecksDocument["checks"][number]> = {},
): GhostChecksDocument {
  return {
    schema: GHOST_CHECKS_SCHEMA,
    id: "example",
    checks: [
      {
        id: "no-decorative-card-grid-for-dense-table",
        title: "Do not replace dense tables with decorative cards",
        status: "active",
        severity: "serious",
        derivation: {
          prose: ["prose.principle:dense-workflows-prioritize-scanning"],
        },
        applies_to: {
          paths: ["apps/dashboard/**"],
        },
        detector: {
          type: "forbidden-regex",
          pattern: "decorativeCardGrid",
        },
        evidence: {
          support: 0.94,
          observed_count: 3,
          examples: ["apps/dashboard/src/routes/orders/page.tsx"],
        },
        ...overrides,
      },
    ],
  };
}

function fingerprintDocument(
  overrides: Partial<GhostFingerprintDocument> = {},
): GhostFingerprintDocument {
  return {
    schema: GHOST_FINGERPRINT_SCHEMA,
    prose: {
      summary: {},
      situations: [],
      principles: [
        {
          id: "dense-workflows-prioritize-scanning",
          principle:
            "Dense workflows optimize for comparison, speed, and recovery.",
        },
      ],
      experience_contracts: [],
    },
    inventory: {
      topology: {
        scopes: [
          {
            id: "lending",
            paths: ["Code/Features/Lending"],
            surface_types: ["native-feature"],
          },
        ],
        surface_types: ["native-feature"],
      },
      building_blocks: {},
      exemplars: [
        {
          id: "orders-table",
          path: "apps/dashboard/src/routes/orders/page.tsx",
        },
      ],
    },
    composition: {
      patterns: [
        {
          id: "tokenized-ui-color",
          kind: "visual",
          pattern: "Use semantic colors.",
        },
      ],
    },
    ...overrides,
  };
}
