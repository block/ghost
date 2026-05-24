import { describe, expect, it } from "vitest";
import {
  GHOST_CHECKS_SCHEMA,
  GHOST_FINGERPRINT_SCHEMA,
  type GhostChecksDocument,
  type GhostFingerprintDocument,
  lintGhostChecks,
} from "../src/ghost-core/index.js";

describe("ghost.checks/v1 grounding", () => {
  it("requires active checks to declare derives_from", () => {
    const doc = checksDocument({
      derives_from: undefined,
    });

    const report = lintGhostChecks(doc);

    expect(report.errors).toBe(1);
    expect(report.issues[0]).toMatchObject({
      rule: "check-grounding-missing",
      path: "checks[0].derives_from",
    });
  });

  it("accepts active checks grounded in fingerprint.yml memory", () => {
    const report = lintGhostChecks(checksDocument(), {
      fingerprint: fingerprintDocument(),
    });

    expect(report.errors).toBe(0);
    expect(report.warnings).toBe(0);
  });

  it("reports active checks grounded in missing fingerprint.yml memory", () => {
    const doc = checksDocument({
      derives_from: "principle:missing-principle",
    });

    const report = lintGhostChecks(doc, {
      fingerprint: fingerprintDocument(),
    });

    expect(report.errors).toBe(1);
    expect(report.issues[0]).toMatchObject({
      rule: "check-grounding-unknown",
      path: "checks[0].derives_from",
    });
  });

  it("downgrades proposed check grounding misses to warnings", () => {
    const doc = checksDocument({
      status: "proposed",
      derives_from: "principle:missing-principle",
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

  it("rejects untyped derives_from references at schema level", () => {
    const doc = checksDocument({
      derives_from: "dense-workflows-prioritize-scanning",
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
        derives_from: "principle:dense-workflows-prioritize-scanning",
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

function fingerprintDocument(): GhostFingerprintDocument {
  return {
    schema: GHOST_FINGERPRINT_SCHEMA,
    summary: {},
    topology: {},
    situations: [],
    principles: [
      {
        id: "dense-workflows-prioritize-scanning",
        status: "accepted",
        principle:
          "Dense workflows optimize for comparison, speed, and recovery.",
      },
    ],
    experience_contracts: [],
    patterns: [],
    substrate: {},
    review_policy: {},
  };
}
