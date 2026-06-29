import { describe, expect, it } from "vitest";
import {
  GHOST_FINGERPRINT_SCHEMA,
  GhostFingerprintSchema,
  lintGhostFingerprint,
} from "../src/ghost-core/fingerprint/index.js";

const SURFACE_IDS = ["core", "dashboard", "docs"];

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
    const report = lintGhostFingerprint(fullFingerprint(), {
      surfaceIds: SURFACE_IDS,
    });

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

  it("rejects the removed topology subtree", () => {
    const input = fullFingerprint();
    (input.inventory as Record<string, unknown>).topology = {
      scopes: [{ id: "dashboard", paths: ["apps/dashboard/**"] }],
    };

    const result = GhostFingerprintSchema.safeParse(input);

    expect(result.success).toBe(false);
  });

  it("rejects the removed applies_to coordinate on a principle", () => {
    const input = fullFingerprint();
    (input.intent.principles[0] as Record<string, unknown>).applies_to = {
      scopes: ["dashboard"],
    };

    const result = GhostFingerprintSchema.safeParse(input);

    expect(result.success).toBe(false);
  });

  it("rejects the removed surface_type/scope coordinates on an exemplar", () => {
    const withSurfaceType = fullFingerprint();
    (
      withSurfaceType.inventory.exemplars[0] as Record<string, unknown>
    ).surface_type = "dense-dashboard";
    expect(GhostFingerprintSchema.safeParse(withSurfaceType).success).toBe(
      false,
    );

    const withScope = fullFingerprint();
    (withScope.inventory.exemplars[0] as Record<string, unknown>).scope =
      "dashboard";
    expect(GhostFingerprintSchema.safeParse(withScope).success).toBe(false);
  });

  it("accepts surface placement on every placeable node", () => {
    const result = GhostFingerprintSchema.safeParse(fullFingerprint());

    expect(result.success).toBe(true);
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

    const report = lintGhostFingerprint(input, { surfaceIds: SURFACE_IDS });

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

    const report = lintGhostFingerprint(input, { surfaceIds: SURFACE_IDS });

    expect(report.errors).toBe(1);
    expect(report.issues[0]).toMatchObject({
      rule: "fingerprint-ref-prefix",
      path: "intent.situations[0].patterns[0]",
    });
  });

  it("reports duplicate ids by collection", () => {
    const input = fullFingerprint();
    input.composition.patterns.push({ ...input.composition.patterns[0] });

    const report = lintGhostFingerprint(input, { surfaceIds: SURFACE_IDS });

    expect(report.errors).toBe(1);
    expect(report.issues[0]).toMatchObject({
      rule: "duplicate-id",
      path: "composition.patterns[1].id",
    });
  });

  it("errors on a placement that is not a declared surface", () => {
    const input = fullFingerprint();
    input.intent.principles[0].surface = "unknown-surface";

    const report = lintGhostFingerprint(input, { surfaceIds: SURFACE_IDS });

    expect(
      report.issues.some(
        (issue) => issue.rule === "fingerprint-surface-unknown",
      ),
    ).toBe(true);
  });

  it("warns on an unplaced node", () => {
    const input = fullFingerprint();
    input.intent.principles[0].surface = undefined;

    const report = lintGhostFingerprint(input, { surfaceIds: SURFACE_IDS });

    expect(
      report.issues.some((issue) => issue.rule === "fingerprint-node-unplaced"),
    ).toBe(true);
  });

  it("skips placement existence checks when no surfaces are provided", () => {
    const input = fullFingerprint();
    input.intent.principles[0].surface = "unknown-surface";

    const report = lintGhostFingerprint(input);

    expect(
      report.issues.some(
        (issue) => issue.rule === "fingerprint-surface-unknown",
      ),
    ).toBe(false);
  });

  it("reports unknown exemplar refs", () => {
    const input = fullFingerprint();
    input.inventory.exemplars[0].refs = ["composition.pattern:missing-pattern"];

    const report = lintGhostFingerprint(input, { surfaceIds: SURFACE_IDS });

    expect(
      report.issues.some(
        (issue) =>
          issue.rule === "fingerprint-ref-unknown" &&
          issue.path === "inventory.exemplars[0].refs[0]",
      ),
    ).toBe(true);
  });

  it("requires check refs to use validate.check:*", () => {
    const input = fullFingerprint();
    input.intent.principles[0].check_refs = [
      "composition.pattern:compact-filter-toolbar",
    ];

    const report = lintGhostFingerprint(input, { surfaceIds: SURFACE_IDS });

    expect(
      report.issues.some(
        (issue) =>
          issue.rule === "fingerprint-check-ref-prefix" &&
          issue.path === "intent.principles[0].check_refs[0]",
      ),
    ).toBe(true);
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
          surface: "dashboard",
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
          surface: "dashboard",
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
          surface: "core",
          obligations: ["confirm intent", "explain consequence"],
        },
      ],
    },
    inventory: {
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
          surface: "dashboard",
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
          surface: "dashboard",
          guidance: ["keep primary filters before secondary actions"],
        },
      ],
    },
  };
}
