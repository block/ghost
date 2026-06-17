import { describe, expect, it } from "vitest";
import {
  buildContextEntrypoint,
  buildFingerprintGraph,
} from "../src/context/entrypoint.js";
import { formatContextEntrypointMarkdown } from "../src/context/entrypoint-markdown.js";
import type { PackageContext } from "../src/context/package-context.js";

describe("context entrypoint", () => {
  it("builds graph nodes and explicit edges from fingerprint refs", () => {
    const graph = buildFingerprintGraph(context());

    expect([...graph.nodeByRef.keys()]).toEqual(
      expect.arrayContaining([
        "prose.situation:refund-review",
        "prose.principle:trust-before-action",
        "prose.experience_contract:reversible-action",
        "composition.pattern:progressive-disclosure",
        "inventory.exemplar:refund-settings-primary",
        "check:no-hardcoded-ui-color",
      ]),
    );
    expect([...graph.nodeByRef.keys()]).not.toContain("check:proposed-density");
    expect(graph.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          from: "prose.situation:refund-review",
          to: "prose.principle:trust-before-action",
        }),
        expect.objectContaining({
          from: "inventory.exemplar:refund-settings-primary",
          to: "composition.pattern:progressive-disclosure",
        }),
        expect.objectContaining({
          from: "check:no-hardcoded-ui-color",
          to: "prose.principle:trust-before-action",
        }),
      ]),
    );
  });

  it("selects path-matched refs, one-hop neighbors, active checks, and omissions", () => {
    const entrypoint = buildContextEntrypoint(context(), {
      targetPaths: ["apps/refunds/settings/page.tsx"],
    });

    expect(entrypoint.match.status).toBe("path-match");
    expect(entrypoint.match.matchedScopes).toEqual(["refund-settings"]);
    expect(entrypoint.selected.prose.map((node) => node.ref)).toEqual(
      expect.arrayContaining([
        "prose.situation:refund-review",
        "prose.principle:trust-before-action",
        "prose.experience_contract:reversible-action",
      ]),
    );
    expect(entrypoint.selected.composition.map((node) => node.ref)).toContain(
      "composition.pattern:progressive-disclosure",
    );
    expect(entrypoint.selected.exemplars.map((node) => node.ref)).toEqual([
      "inventory.exemplar:refund-settings-primary",
      "inventory.exemplar:refund-settings-secondary",
      "inventory.exemplar:refund-settings-tertiary",
    ]);
    expect(entrypoint.selected.checks.map((node) => node.ref)).toEqual([
      "check:no-hardcoded-ui-color",
    ]);
    expect(entrypoint.omissions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Exemplars",
          omitted: 2,
          source: "fingerprint/inventory.yml",
        }),
      ]),
    );
  });

  it("builds an action contract from selected context", () => {
    const entrypoint = buildContextEntrypoint(context(), {
      targetPaths: ["apps/refunds/settings/page.tsx"],
    });

    expect(entrypoint.actionContract.preserve).toEqual([
      "Make reversibility and consequences visible.",
      "Trust cues should appear before irreversible actions.",
      "Important actions expose a recovery path.",
      "Reveal advanced refund details only after the summary.",
      "User intent: Understand refund impact before submitting.",
    ]);
    expect(entrypoint.actionContract.inspect).toEqual([
      {
        path: "apps/refunds/settings/primary.tsx",
        reason: "source surface for inventory.exemplar:refund-settings-primary",
      },
      {
        path: "apps/refunds/settings/secondary.tsx",
        reason:
          "source surface for inventory.exemplar:refund-settings-secondary",
      },
      {
        path: "apps/refunds/settings/tertiary.tsx",
        reason:
          "source surface for inventory.exemplar:refund-settings-tertiary",
      },
      {
        path: "fingerprint/prose.yml",
        reason: "selected prose anchors and full intent",
      },
      {
        path: "fingerprint/composition.yml",
        reason: "selected composition patterns and neighboring patterns",
      },
    ]);
    expect(entrypoint.actionContract.avoid).toEqual([
      "hide money movement risk",
      "Counterexample: Hide consequence copy until after submission.",
      "Avoid: Bury the refund summary behind advanced controls.",
    ]);
    expect(entrypoint.actionContract.validate).toEqual([
      "check:no-hardcoded-ui-color - serious: Use design tokens for UI color",
    ]);
    expect(entrypoint.actionContract.validate.join("\n")).not.toContain(
      "proposed-density",
    );
  });

  it("falls back to a compact global entrypoint when no scope matches", () => {
    const entrypoint = buildContextEntrypoint(context(), {
      targetPaths: ["apps/payroll/page.tsx"],
    });

    expect(entrypoint.match.status).toBe("global-fallback");
    expect(entrypoint.match.reasons.join("\n")).toContain(
      "No fingerprint scope matched",
    );
    expect(entrypoint.suggestedReads.map((read) => read.path)).toEqual(
      expect.arrayContaining([
        "fingerprint/prose.yml",
        "fingerprint/inventory.yml",
        "fingerprint/composition.yml",
      ]),
    );
  });

  it("carries source layer provenance from resolved stacks", () => {
    const entrypoint = buildContextEntrypoint(context());

    expect(entrypoint.match.sourceLayers).toEqual([
      "/repo/.ghost",
      "/repo/apps/refunds/.ghost",
    ]);
  });

  it("formats multi-sentence identity fields as readable bullets", () => {
    const entrypoint = buildContextEntrypoint(
      context({ multiSentenceIdentity: true }),
    );

    const markdown = formatContextEntrypointMarkdown(entrypoint);

    expect(markdown).toContain(
      "- Goals:\n  - Keep product-surface composition fingerprints easy for agents to read.\n  - Preserve surface composition across generation and review.",
    );
    expect(markdown).toContain("- Tone: plain, precise");
    expect(markdown).not.toContain("read., Preserve");
  });

  it("renders the task contract before detailed read-first refs", () => {
    const markdown = formatContextEntrypointMarkdown(
      buildContextEntrypoint(context(), {
        targetPaths: ["apps/refunds/settings/page.tsx"],
      }),
    );

    expect(markdown).toContain("## Task Contract");
    expect(markdown).toContain("### Preserve");
    expect(markdown.indexOf("## Task Contract")).toBeLessThan(
      markdown.indexOf("## Read First"),
    );
  });

  it("keeps selected matching refs stable when unrelated entries reorder", () => {
    const normal = buildContextEntrypoint(context());
    const reordered = buildContextEntrypoint(
      context({ reorderUnrelated: true }),
    );

    expect(reordered.selected.exemplars.map((node) => node.ref)).toEqual(
      normal.selected.exemplars.map((node) => node.ref),
    );
    expect(reordered.selected.prose.map((node) => node.ref)).toEqual(
      normal.selected.prose.map((node) => node.ref),
    );
  });
});

function context(
  options: { reorderUnrelated?: boolean; multiSentenceIdentity?: boolean } = {},
): PackageContext {
  const unrelated = {
    id: "unrelated",
    path: "apps/onboarding/page.tsx",
    scope: "onboarding",
    surface_type: "setup",
    why: "Unrelated onboarding surface.",
  };
  const refundExemplars = [
    exemplar("primary"),
    exemplar("secondary"),
    exemplar("tertiary"),
    exemplar("quaternary"),
  ];
  return {
    name: "cash-dashboard",
    fingerprintDir: ".ghost",
    targetPaths: ["apps/refunds/settings/page.tsx"],
    layerDirs: ["/repo/.ghost", "/repo/apps/refunds/.ghost"],
    fingerprintRaw: "",
    inventory: {
      state: "missing",
      path: ".ghost/fingerprint/sources/cache/inventory.json",
    },
    fingerprintLayers: {
      manifest: "schema: ghost.fingerprint-package/v1\nid: local\n",
    },
    fingerprint: {
      schema: "ghost.fingerprint/v1",
      prose: {
        summary: {
          product: "Cash Dashboard",
          audience: options.multiSentenceIdentity
            ? ["operators", "agents generating product UI"]
            : ["operators"],
          goals: options.multiSentenceIdentity
            ? [
                "Keep product-surface composition fingerprints easy for agents to read.",
                "Preserve surface composition across generation and review.",
              ]
            : ["make refund decisions feel reversible"],
          anti_goals: options.multiSentenceIdentity
            ? [
                "Treat raw inventory as canonical surface guidance.",
                "Let advisory review block work without deterministic checks.",
              ]
            : ["hide money movement risk"],
          tradeoffs: options.multiSentenceIdentity
            ? [
                "Prefer compact durable prose over exhaustive surveys.",
                "Preserve portable language over company-specific strategy.",
              ]
            : ["trust over throughput"],
          tone: options.multiSentenceIdentity
            ? ["plain", "precise"]
            : ["direct"],
        },
        situations: [
          {
            id: "refund-review",
            title: "Refund review",
            user_intent: "Understand refund impact before submitting.",
            product_obligation: "Make reversibility and consequences visible.",
            surface_type: "settings",
            principles: ["prose.principle:trust-before-action"],
            experience_contracts: [
              "prose.experience_contract:reversible-action",
            ],
            patterns: ["composition.pattern:progressive-disclosure"],
          },
        ],
        principles: [
          {
            id: "trust-before-action",
            principle: "Trust cues should appear before irreversible actions.",
            applies_to: {
              scopes: ["refund-settings"],
            },
            guidance: ["Put consequence copy near the submit affordance."],
            counterexamples: ["Hide consequence copy until after submission."],
            check_refs: ["check:no-hardcoded-ui-color"],
          },
        ],
        experience_contracts: [
          {
            id: "reversible-action",
            contract: "Important actions expose a recovery path.",
            applies_to: {
              surface_types: ["settings"],
            },
            obligations: ["Show cancel or edit before confirmation."],
          },
        ],
      },
      inventory: {
        topology: {
          scopes: [
            {
              id: "refund-settings",
              paths: ["apps/refunds/settings"],
              surface_types: ["settings"],
            },
          ],
          surface_types: ["settings"],
        },
        building_blocks: {},
        exemplars: options.reorderUnrelated
          ? [unrelated, ...refundExemplars]
          : [...refundExemplars, unrelated],
        sources: [],
      },
      composition: {
        patterns: [
          {
            id: "progressive-disclosure",
            kind: "flow",
            pattern: "Reveal advanced refund details only after the summary.",
            applies_to: {
              scopes: ["refund-settings"],
            },
            guidance: ["Keep the default state scannable."],
            anti_patterns: [
              "Bury the refund summary behind advanced controls.",
            ],
            check_refs: ["check:no-hardcoded-ui-color"],
          },
        ],
      },
    },
    checks: {
      schema: "ghost.checks/v1",
      id: "cash-dashboard",
      checks: [
        {
          id: "no-hardcoded-ui-color",
          title: "Use design tokens for UI color",
          status: "active",
          severity: "serious",
          derivation: {
            prose: ["prose.principle:trust-before-action"],
            composition: ["composition.pattern:progressive-disclosure"],
            inventory: ["inventory.exemplar:refund-settings-primary"],
          },
          applies_to: {
            scopes: ["refund-settings"],
            paths: ["apps/refunds/settings"],
          },
          detector: {
            type: "forbidden-regex",
            pattern: "#[0-9a-fA-F]{3,8}",
          },
          repair: "Use semantic tokens.",
        },
        {
          id: "proposed-density",
          title: "Proposed density check",
          status: "proposed",
          severity: "nit",
          detector: {
            type: "required-regex",
            pattern: "Density",
          },
        },
      ],
    },
  };
}

function exemplar(id: string) {
  return {
    id: `refund-settings-${id}`,
    path: `apps/refunds/settings/${id}.tsx`,
    title: `Refund settings ${id}`,
    scope: "refund-settings",
    surface_type: "settings",
    why: `Shows refund settings ${id}.`,
    refs: [
      "prose.principle:trust-before-action",
      "composition.pattern:progressive-disclosure",
    ],
  } as const;
}
