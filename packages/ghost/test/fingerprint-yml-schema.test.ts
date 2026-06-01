import { describe, expect, it } from "vitest";
import {
  GHOST_FINGERPRINT_SCHEMA,
  GhostFingerprintSchema,
  lintGhostFingerprint,
} from "../src/ghost-core/fingerprint/index.js";

describe("ghost.fingerprint/v1", () => {
  it("accepts a minimal fingerprint.yml document", () => {
    const result = GhostFingerprintSchema.safeParse(minimalFingerprint());

    expect(result.success).toBe(true);
  });

  it("accepts a full OSS-friendly fingerprint.yml document", () => {
    const report = lintGhostFingerprint(fullFingerprint());

    expect(report.errors).toBe(0);
    expect(report.issues).toEqual([]);
  });

  it("rejects old substrate top-level fields", () => {
    const result = GhostFingerprintSchema.safeParse({
      ...minimalFingerprint(),
      substrate: {},
    });

    expect(result.success).toBe(false);
  });

  it("rejects implementation vocabulary as a typed ref target", () => {
    const input = fullFingerprint();
    input.situations[0].patterns = [
      "implementation_vocabulary:semantic-tokens",
    ];

    const result = GhostFingerprintSchema.safeParse(input);

    expect(result.success).toBe(false);
  });

  it("reports unknown typed refs inside the fingerprint", () => {
    const input = fullFingerprint();
    input.situations[0].principles = ["principle:missing-principle"];

    const report = lintGhostFingerprint(input);

    expect(report.errors).toBe(1);
    expect(report.issues[0]).toMatchObject({
      rule: "fingerprint-ref-unknown",
      path: "situations[0].principles[0]",
    });
  });

  it("reports mismatched typed ref prefixes", () => {
    const input = fullFingerprint();
    input.situations[0].patterns = [
      "principle:dense-workflows-prioritize-scanning",
    ];

    const report = lintGhostFingerprint(input);

    expect(report.errors).toBe(1);
    expect(report.issues[0]).toMatchObject({
      rule: "fingerprint-ref-prefix",
      path: "situations[0].patterns[0]",
    });
  });

  it("reports duplicate ids by collection", () => {
    const input = fullFingerprint();
    input.patterns.push({ ...input.patterns[0] });

    const report = lintGhostFingerprint(input);

    expect(report.errors).toBe(1);
    expect(report.issues[0]).toMatchObject({
      rule: "duplicate-id",
      path: "patterns[1].id",
    });
  });

  it("reports duplicate topology surface types", () => {
    const input = fullFingerprint();
    input.topology.surface_types.push("dense-dashboard");

    const report = lintGhostFingerprint(input);

    expect(report.errors).toBe(1);
    expect(report.issues[0]).toMatchObject({
      rule: "duplicate-id",
      path: "topology.surface_types[2]",
    });
  });

  it("reports unknown topology scope and surface type references", () => {
    const input = fullFingerprint();
    input.situations[0].surface_type = "unknown-surface";
    input.principles[0].applies_to = {
      scopes: ["unknown-scope"],
      surface_types: ["unknown-surface"],
      situations: ["unknown-situation"],
    };

    const report = lintGhostFingerprint(input);

    expect(report.errors).toBe(4);
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rule: "fingerprint-surface-type-unknown",
          path: "situations[0].surface_type",
        }),
        expect.objectContaining({
          rule: "fingerprint-scope-unknown",
          path: "principles[0].applies_to.scopes[0]",
        }),
        expect.objectContaining({
          rule: "fingerprint-surface-type-unknown",
          path: "principles[0].applies_to.surface_types[0]",
        }),
        expect.objectContaining({
          rule: "fingerprint-situation-unknown",
          path: "principles[0].applies_to.situations[0]",
        }),
      ]),
    );
  });

  it("requires check refs to use check:*", () => {
    const input = fullFingerprint();
    input.principles[0].check_refs = ["pattern:compact-filter-toolbar"];

    const report = lintGhostFingerprint(input);

    expect(report.errors).toBe(1);
    expect(report.issues[0]).toMatchObject({
      rule: "fingerprint-check-ref-prefix",
      path: "principles[0].check_refs[0]",
    });
  });
});

function minimalFingerprint() {
  return {
    schema: GHOST_FINGERPRINT_SCHEMA,
    summary: {},
    topology: {},
    situations: [],
    principles: [],
    experience_contracts: [],
    patterns: [],
    implementation_vocabulary: {},
    review_policy: {},
  };
}

function fullFingerprint() {
  return {
    schema: GHOST_FINGERPRINT_SCHEMA,
    summary: {
      product: "Example dashboard",
      audience: ["operators"],
      goals: ["preserve scan speed"],
      anti_goals: ["turn dense workflows into marketing pages"],
      tradeoffs: ["density versus explanation"],
      tone: ["plain", "task-fit"],
    },
    topology: {
      scopes: [
        {
          id: "dashboard",
          paths: ["apps/dashboard/**"],
          surface_types: ["dense-dashboard"],
        },
      ],
      surface_types: ["dense-dashboard", "docs"],
      examples: [
        {
          path: "apps/dashboard/src/routes/orders/page.tsx",
          surface_type: "dense-dashboard",
          note: "Order review table",
        },
      ],
    },
    situations: [
      {
        id: "user-is-filtering-an-operations-table",
        user_intent: "find and compare records quickly",
        product_obligation: "preserve scan speed and reduce accidental changes",
        surface_type: "dense-dashboard",
        hierarchy: {
          primary: "table readability and filtering",
          secondary: "bulk actions and record detail",
        },
        refuses: ["oversized marketing hero"],
        principles: ["principle:dense-workflows-prioritize-scanning"],
        experience_contracts: [
          "experience_contract:destructive-actions-require-clear-confirmation",
        ],
        patterns: ["pattern:compact-filter-toolbar"],
      },
    ],
    principles: [
      {
        id: "dense-workflows-prioritize-scanning",
        status: "accepted",
        principle:
          "Dense operational workflows should optimize for comparison, speed, and recovery before visual novelty.",
        applies_to: {
          scopes: ["dashboard"],
          surface_types: ["dense-dashboard"],
        },
        guidance: ["keep controls close to the table or list they affect"],
        evidence: [
          {
            path: "apps/dashboard/src/routes/orders/page.tsx",
          },
        ],
        counterexamples: [
          "marketing pages may use larger narrative composition",
        ],
        check_refs: ["check:no-decorative-card-grid-for-dense-table"],
      },
    ],
    experience_contracts: [
      {
        id: "destructive-actions-require-clear-confirmation",
        status: "accepted",
        contract:
          "Destructive actions need explicit confirmation and a clear recovery path.",
        obligations: ["confirm intent", "explain consequence"],
      },
    ],
    patterns: [
      {
        id: "compact-filter-toolbar",
        status: "accepted",
        kind: "composition",
        pattern: "Filters stay visually attached to the table they affect.",
        guidance: ["keep primary filters before secondary actions"],
      },
    ],
    implementation_vocabulary: {
      tokens: ["use semantic color tokens"],
      components: ["prefer shared table primitives"],
      libraries: ["local dashboard primitives"],
      assets: ["status icons"],
      notes: ["current vocabulary is replaceable implementation material"],
    },
    review_policy: {
      proposal_policy: ["agents may propose but not promote memory"],
      experience_gap_categories: ["missing-memory", "unclear-intent"],
      memory_gap_policy: ["continue conservatively and propose durable memory"],
    },
  };
}
