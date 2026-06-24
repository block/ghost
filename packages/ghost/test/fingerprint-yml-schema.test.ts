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
    if (!result.success) throw new Error("minimal fingerprint should parse");
    expect(result.data).toEqual({
      schema: GHOST_FINGERPRINT_SCHEMA,
      intent: {
        summary: {},
        situations: [],
        principles: [],
        experience_contracts: [],
      },
      inventory: {
        topology: {},
        building_blocks: {},
        exemplars: [],
        sources: [],
      },
      composition: {
        patterns: [],
      },
    });
  });

  it("accepts a full OSS-friendly fingerprint.yml document", () => {
    const report = lintGhostFingerprint(fullFingerprint());

    expect(report.errors).toBe(0);
    expect(report.issues).toEqual([]);
  });

  it("rejects v1 flat top-level fields", () => {
    const result = GhostFingerprintSchema.safeParse({
      ...minimalFingerprint(),
      principles: [],
      implementation_vocabulary: {},
    });

    expect(result.success).toBe(false);
  });

  it("rejects old topology examples", () => {
    const input = fullFingerprint();
    (input.inventory.topology as Record<string, unknown>).examples = [
      {
        path: "apps/dashboard/src/routes/orders/page.tsx",
        surface_type: "dense-dashboard",
      },
    ];

    const result = GhostFingerprintSchema.safeParse(input);

    expect(result.success).toBe(false);
  });

  it("rejects implementation vocabulary as a typed ref target", () => {
    const input = fullFingerprint();
    input.intent.situations[0].patterns = [
      "implementation_vocabulary:semantic-tokens",
    ];

    const result = GhostFingerprintSchema.safeParse(input);

    expect(result.success).toBe(false);
  });

  it("rejects legacy status fields in canonical fingerprint.yml entries", () => {
    const principle = fullFingerprint();
    principle.intent.principles[0].status = "accepted" as never;
    expect(GhostFingerprintSchema.safeParse(principle).success).toBe(false);

    const contract = fullFingerprint();
    contract.intent.experience_contracts[0].status = "accepted" as never;
    expect(GhostFingerprintSchema.safeParse(contract).success).toBe(false);

    const pattern = fullFingerprint();
    pattern.composition.patterns[0].status = "accepted" as never;
    expect(GhostFingerprintSchema.safeParse(pattern).success).toBe(false);
  });

  it("reports unknown typed refs inside the fingerprint", () => {
    const input = fullFingerprint();
    input.intent.situations[0].principles = [
      "intent.principle:missing-principle",
    ];

    const report = lintGhostFingerprint(input);

    expect(report.errors).toBe(1);
    expect(report.issues[0]).toMatchObject({
      rule: "fingerprint-ref-unknown",
      path: "intent.situations[0].principles[0]",
    });
  });

  it("reports mismatched typed ref prefixes", () => {
    const input = fullFingerprint();
    input.intent.situations[0].patterns = [
      "intent.principle:dense-workflows-prioritize-scanning",
    ];

    const report = lintGhostFingerprint(input);

    expect(report.errors).toBe(1);
    expect(report.issues[0]).toMatchObject({
      rule: "fingerprint-ref-prefix",
      path: "intent.situations[0].patterns[0]",
    });
  });

  it("reports duplicate ids by collection", () => {
    const input = fullFingerprint();
    input.composition.patterns.push({ ...input.composition.patterns[0] });

    const report = lintGhostFingerprint(input);

    expect(report.errors).toBe(1);
    expect(report.issues[0]).toMatchObject({
      rule: "duplicate-id",
      path: "composition.patterns[1].id",
    });
  });

  it("reports duplicate topology surface types", () => {
    const input = fullFingerprint();
    input.inventory.topology.surface_types?.push("dense-dashboard");

    const report = lintGhostFingerprint(input);

    expect(report.errors).toBe(1);
    expect(report.issues[0]).toMatchObject({
      rule: "duplicate-id",
      path: "inventory.topology.surface_types[2]",
    });
  });

  it("reports unknown topology scope and surface type references", () => {
    const input = fullFingerprint();
    input.intent.situations[0].surface_type = "unknown-surface";
    input.inventory.exemplars[0].scope = "unknown-scope";
    input.inventory.exemplars[0].surface_type = "unknown-surface";
    input.intent.principles[0].applies_to = {
      scopes: ["unknown-scope"],
      surface_types: ["unknown-surface"],
      situations: ["unknown-situation"],
    };

    const report = lintGhostFingerprint(input);

    expect(report.errors).toBe(6);
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rule: "fingerprint-surface-type-unknown",
          path: "intent.situations[0].surface_type",
        }),
        expect.objectContaining({
          rule: "fingerprint-scope-unknown",
          path: "intent.principles[0].applies_to.scopes[0]",
        }),
        expect.objectContaining({
          rule: "fingerprint-surface-type-unknown",
          path: "intent.principles[0].applies_to.surface_types[0]",
        }),
        expect.objectContaining({
          rule: "fingerprint-situation-unknown",
          path: "intent.principles[0].applies_to.situations[0]",
        }),
        expect.objectContaining({
          rule: "fingerprint-scope-unknown",
          path: "inventory.exemplars[0].scope",
        }),
        expect.objectContaining({
          rule: "fingerprint-surface-type-unknown",
          path: "inventory.exemplars[0].surface_type",
        }),
      ]),
    );
  });

  it("reports unknown exemplar refs", () => {
    const input = fullFingerprint();
    input.inventory.exemplars[0].refs = ["composition.pattern:missing-pattern"];

    const report = lintGhostFingerprint(input);

    expect(report.errors).toBe(1);
    expect(report.issues[0]).toMatchObject({
      rule: "fingerprint-ref-unknown",
      path: "inventory.exemplars[0].refs[0]",
    });
  });

  it("requires check refs to use validate.check:*", () => {
    const input = fullFingerprint();
    input.intent.principles[0].check_refs = [
      "composition.pattern:compact-filter-toolbar",
    ];

    const report = lintGhostFingerprint(input);

    expect(report.errors).toBe(1);
    expect(report.issues[0]).toMatchObject({
      rule: "fingerprint-check-ref-prefix",
      path: "intent.principles[0].check_refs[0]",
    });
  });
});

function minimalFingerprint() {
  return {
    schema: GHOST_FINGERPRINT_SCHEMA,
  };
}

function fullFingerprint() {
  return {
    schema: GHOST_FINGERPRINT_SCHEMA,
    intent: {
      summary: {
        product: "Example dashboard",
        audience: ["operators"],
        goals: ["preserve scan speed"],
        anti_goals: ["turn dense workflows into marketing pages"],
        tradeoffs: ["density versus explanation"],
        tone: ["plain", "task-fit"],
      },
      situations: [
        {
          id: "user-is-filtering-an-operations-table",
          user_intent: "find and compare records quickly",
          product_obligation:
            "preserve scan speed and reduce accidental changes",
          surface_type: "dense-dashboard",
          hierarchy: {
            primary: "table readability and filtering",
            secondary: "bulk actions and record detail",
          },
          refuses: ["oversized marketing hero"],
          principles: ["intent.principle:dense-workflows-prioritize-scanning"],
          experience_contracts: [
            "intent.experience_contract:destructive-actions-require-clear-confirmation",
          ],
          patterns: ["composition.pattern:compact-filter-toolbar"],
        },
      ],
      principles: [
        {
          id: "dense-workflows-prioritize-scanning",
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
          check_refs: [
            "validate.check:no-decorative-card-grid-for-dense-table",
          ],
        },
      ],
      experience_contracts: [
        {
          id: "destructive-actions-require-clear-confirmation",
          contract:
            "Destructive actions need explicit confirmation and a clear recovery path.",
          obligations: ["confirm intent", "explain consequence"],
        },
      ],
    },
    inventory: {
      topology: {
        scopes: [
          {
            id: "dashboard",
            paths: ["apps/dashboard/**"],
            surface_types: ["dense-dashboard"],
          },
        ],
        surface_types: ["dense-dashboard", "docs"],
      },
      building_blocks: {
        tokens: ["use semantic color tokens"],
        components: ["prefer shared table primitives"],
        libraries: ["local dashboard primitives"],
        assets: ["status icons"],
        routes: ["/orders"],
        files: ["apps/dashboard/src/routes/orders/page.tsx"],
        notes: ["current vocabulary is replaceable implementation material"],
      },
      exemplars: [
        {
          id: "orders-table",
          path: "apps/dashboard/src/routes/orders/page.tsx",
          title: "Order review table",
          surface_type: "dense-dashboard",
          scope: "dashboard",
          note: "Dense filtering and comparison surface.",
          why: "Shows the compact hierarchy future dashboard work should preserve.",
          refs: [
            "intent.principle:dense-workflows-prioritize-scanning",
            "composition.pattern:compact-filter-toolbar",
          ],
        },
      ],
    },
    composition: {
      patterns: [
        {
          id: "compact-filter-toolbar",
          kind: "layout",
          pattern: "Filters stay visually attached to the table they affect.",
          guidance: ["keep primary filters before secondary actions"],
        },
      ],
    },
  };
}
