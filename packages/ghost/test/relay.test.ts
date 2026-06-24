import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { gatherRelayContext } from "../src/relay.js";
import {
  createSingleSurfaceSandbox,
  removeSandbox,
} from "./fixtures/context-sandboxes/harness.js";

describe("relay", () => {
  const roots: string[] = [];

  afterEach(async () => {
    await Promise.all(roots.splice(0).map((root) => removeSandbox(root)));
  });

  it("gathers structured fingerprint context for a target", async () => {
    const root = await track(createSingleSurfaceSandbox());

    const result = await gatherRelayContext({
      cwd: root,
      target: "apps/refunds/settings/page.tsx",
    });

    expect(result.schema).toBe("ghost.relay.gather/v2");
    expect(result.context_packet.schema).toBe("ghost.context-packet/v1");
    expect(result.context_packet.target).toMatchObject({
      mode: "generation",
      paths: ["apps/refunds/settings/page.tsx"],
      requested_capabilities: expect.arrayContaining([
        "product.posture",
        "design.composition",
      ]),
    });
    expect(result.context_packet.dialect).toMatchObject({
      id: "ghost.default/v1",
      source: "default",
    });
    expect(result.context_packet.lanes.intent).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ref: "intent.principle:refund-trust",
          source: "intent.yml",
        }),
      ]),
    );
    expect(result.context_packet.lanes.composition).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ref: "composition.pattern:refund-disclosure",
          source: "composition.yml",
        }),
      ]),
    );
    expect(result.context_packet.lanes.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ref: "validate.check:no-hardcoded-ui-color",
          source: "validate.yml",
        }),
      ]),
    );
    expect(result.context_packet.trace.selected).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "composition.yml",
          lane: "composition",
          ref: "composition.pattern:refund-disclosure",
        }),
      ]),
    );
    expect(result.source.kind).toBe("stack");
    expect(result.targetPaths).toEqual(["apps/refunds/settings/page.tsx"]);
    expect(result.selected_context.match.status).toBe("path-match");
    expect(result.selected_context.match.matched_scopes).toEqual([
      "refund-settings",
    ]);
    expect(result.selected_context.stack).toHaveLength(1);
    expect(result.selected_context.context_hits).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ref: "intent.principle:refund-trust",
          kind: "intent",
          why_selected: expect.arrayContaining([
            { kind: "scope", value: "refund-settings" },
          ]),
        }),
        expect.objectContaining({
          ref: "composition.pattern:refund-disclosure",
          kind: "composition",
          why_selected: expect.arrayContaining([
            { kind: "scope", value: "refund-settings" },
          ]),
        }),
        expect.objectContaining({
          ref: "validate.check:no-hardcoded-ui-color",
          kind: "validation",
          why_selected: expect.arrayContaining([
            { kind: "path", value: "apps/refunds/settings/page.tsx" },
          ]),
        }),
      ]),
    );
    expect(result.brief).toContain("# Ghost Relay Brief");
    expect(result.brief).toContain("## Context Hits");
    expect(result.brief).toContain("intent.principle:refund-trust");
    expect(result.brief).toContain("why: scope=refund-settings");
    expect(result).not.toHaveProperty("entrypoint");
    expect(result).not.toHaveProperty("cascade_brief");
    expect(result.selected_context).not.toHaveProperty("intent");
    expect(result.selected_context).not.toHaveProperty("composition");
    expect(result.selected_context).not.toHaveProperty("inventory");
    expect(result.selected_context).not.toHaveProperty("validation");
    expect(result.selected_context).not.toHaveProperty("guidance");
    expect(result.selected_context).not.toHaveProperty("active_obligations");
  });

  it("renders a three-package sparse posture stack in root-to-leaf order", async () => {
    const root = await track(createThreeLayerPostureSandbox());

    const result = await gatherRelayContext({
      cwd: root,
      target: "products/seller/payments/review.tsx",
    });

    expect(result.source.kind).toBe("stack");
    expect(result.stackDirs.map((dir) => relativeToSandbox(root, dir))).toEqual(
      [".ghost", "products/seller/.ghost", "products/seller/payments/.ghost"],
    );
    expect(result.selected_context.stack.map((pkg) => pkg.label)).toEqual([
      "root",
      "package 2",
      "leaf",
    ]);
    expect(result.selected_context.posture).toMatchObject({
      product: "Block",
      audience: ["people moving money", "sellers"],
      goals: [
        "Protect money movement across perspectives.",
        "Help sellers understand operational state.",
        "Make payout review reversible before commitment.",
      ],
      anti_goals: ["Hide payout timing until after action."],
    });
    expect(result.brief.indexOf("root: `")).toBeLessThan(
      result.brief.indexOf("package 2: `"),
    );
    expect(result.brief.indexOf("package 2: `")).toBeLessThan(
      result.brief.indexOf("leaf: `"),
    );
    expect(
      result.selected_context.context_hits.map((node) => node.ref),
    ).toEqual(
      expect.arrayContaining([
        "intent.principle:protect-money-movement",
        "intent.principle:seller-operational-confidence",
        "intent.situation:payment-review",
      ]),
    );
    expect(result.brief).toContain(
      "Money movement surfaces preserve confidence before commitment.",
    );
    expect(result.brief).toContain("## Posture");
    expect(result.brief).toContain("Product: Block");
    expect(result.brief).toContain("people moving money");
    expect(result.brief).toContain(
      "Help sellers understand operational state.",
    );
    expect(result.brief).toContain(
      "Seller payment review keeps reversal and timing understandable.",
    );
    expect(result.brief).toContain(
      "User intent: Confirm payout timing before taking action.",
    );
    expect(result.brief).not.toContain("User needs to Confirm");
  });

  it("renders summary posture when no ref-backed intent anchors match", async () => {
    const root = await track(createSummaryOnlyPostureSandbox());

    const result = await gatherRelayContext({
      cwd: root,
      target: "app/settings/page.tsx",
    });

    expect(
      result.selected_context.context_hits.filter(
        (hit) => hit.kind === "intent",
      ),
    ).toEqual([]);
    expect(result.selected_context.posture).toMatchObject({
      product: "Settings Console",
      audience: ["operators"],
      goals: [
        "Preserve platform trust.",
        "Make settings changes feel deliberate.",
      ],
      anti_goals: ["Turn settings into a marketing page."],
    });
    expect(result.selected_context.gaps).toContainEqual(
      expect.objectContaining({
        kind: "no-intent",
        message: expect.stringContaining(
          "No ref-backed intent anchors were selected",
        ),
      }),
    );
    expect(result.brief).toContain("## Posture");
    expect(result.brief).toContain("Product: Settings Console");
    expect(result.brief).toContain("Preserve platform trust.");
    expect(result.brief).toContain(
      "No ref-backed intent anchors were selected",
    );
    expect(result.brief).toContain("Start from posture");
  });

  it("records surface-type, linked-ref, and global-fallback hit reasons", async () => {
    const root = await track(createSingleSurfaceSandbox());
    const linkedRoot = await track(createLinkedReasonSandbox());

    const result = await gatherRelayContext({
      cwd: root,
      target: "apps/refunds/settings/page.tsx",
    });

    expect(hitReasons(result, "intent.situation:refund-review")).toContainEqual(
      { kind: "surface_type", value: "settings" },
    );
    const linked = await gatherRelayContext({
      cwd: linkedRoot,
      target: "app/page.tsx",
    });
    expect(
      hitReasons(linked, "composition.pattern:linked-panel"),
    ).toContainEqual({
      kind: "linked_ref",
      value: "intent.situation:settings-task",
    });

    const fallback = await gatherRelayContext({
      cwd: root,
      target: "apps/payroll/page.tsx",
    });

    expect(fallback.selected_context.match.status).toBe("global-fallback");
    expect(fallback.selected_context.context_hits[0].why_selected).toEqual([
      { kind: "global_fallback", value: "apps/payroll/page.tsx" },
    ]);
  });

  it("projects declared custom questions, provenance, and extension lanes", async () => {
    const root = await track(createSingleSurfaceSandbox());
    await mkdir(join(root, "product"), { recursive: true });
    await writeFile(
      join(root, ".ghost", "dialect.yml"),
      `schema: ghost.dialect/v1
id: acme.product-surface/v1
profile: ghost.product-surface/v1
facets:
  - id: product-questions
    path: product/questions.yml
    lane: questions
    capabilities:
      - prompt.disambiguation
      - human.escalation
    projection:
      items_path: questions
      id_path: id
      summary_path: question
      content_paths:
        - blocks
      max_chars: 4000
  - id: product-sources
    path: product/sources.yml
    lane: provenance
    capabilities:
      - source.grounding
    projection:
      items_path: sources
      id_path: id
      summary_path: summary
  - id: brand-voice
    path: product/brand.yml
    lane: extension:brand_voice
    capabilities:
      - agent.context
    projection:
      items_path: guidance
      id_path: id
      summary_path: summary
  - id: internal-questions
    path: product/internal.yml
    lane: questions
    visibility: internal
    capabilities:
      - prompt.disambiguation
    projection:
      items_path: questions
      summary_path: question
  - id: schema-only
    path: product/schema-only.yml
    lane: questions
    capabilities:
      - prompt.disambiguation
`,
    );
    await writeFile(
      join(root, "product", "questions.yml"),
      `questions:
  - id: refund-policy
    question: Should refunds require manager approval?
    blocks:
      - final copy
`,
    );
    await writeFile(
      join(root, "product", "sources.yml"),
      `sources:
  - id: design-registry
    summary: Registry source for refund settings.
`,
    );
    await writeFile(
      join(root, "product", "brand.yml"),
      `guidance:
  - id: plain-language
    summary: Use plain operational language.
`,
    );
    await writeFile(
      join(root, "product", "internal.yml"),
      `questions:
  - id: internal-policy
    question: Hidden internal question.
`,
    );
    await writeFile(
      join(root, "product", "schema-only.yml"),
      "schema: acme/v1\n",
    );

    const result = await gatherRelayContext({
      cwd: root,
      target: "apps/refunds/settings/page.tsx",
      mode: "prompt",
    });

    expect(result.context_packet.dialect).toMatchObject({
      id: "acme.product-surface/v1",
      source: "file",
    });
    expect(result.context_packet.target).toMatchObject({
      mode: "prompt",
      requested_capabilities: [
        "product.posture",
        "prompt.routing",
        "prompt.disambiguation",
        "relay.stack-resolution",
        "agent.context",
        "human.escalation",
      ],
    });
    expect(result.context_packet.lanes.questions).toEqual([
      expect.objectContaining({
        id: "refund-policy",
        source: "product/questions.yml",
        summary: "Should refunds require manager approval?",
        content: { blocks: ["final copy"] },
      }),
    ]);
    expect(result.context_packet.lanes.provenance).toEqual([]);
    expect(result.context_packet.extensions.brand_voice).toEqual([
      expect.objectContaining({
        id: "plain-language",
        source: "product/brand.yml",
        summary: "Use plain operational language.",
      }),
    ]);
    expect(result.context_packet.trace.selected).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "product/questions.yml",
          lane: "questions",
          facet: "product-questions",
        }),
        expect.objectContaining({
          source: "product/brand.yml",
          lane: "extension:brand_voice",
          facet: "brand-voice",
        }),
      ]),
    );
    expect(result.context_packet.trace.omitted).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          facet: "internal-questions",
          reason: ["visibility is internal"],
        }),
        expect.objectContaining({
          facet: "schema-only",
          reason: ["facet has no projection declaration"],
        }),
        expect.objectContaining({
          facet: "product-sources",
          reason: ["does not provide requested capabilities"],
        }),
      ]),
    );
  });

  it("rejects unnamespaced extension lanes and custom capabilities", async () => {
    const root = await track(createSingleSurfaceSandbox());
    await writeFile(
      join(root, ".ghost", "dialect.yml"),
      `schema: ghost.dialect/v1
id: acme.invalid/v1
facets:
  - id: invalid-extension
    path: product/brand.yml
    lane: brand_voice
    capabilities:
      - acme.brand-guidance
    projection:
      summary_path: summary
  - id: invalid-capability
    path: product/questions.yml
    lane: questions
    capabilities:
      - brand-guidance
    projection:
      summary_path: summary
`,
    );

    await expect(
      gatherRelayContext({
        cwd: root,
        target: "apps/refunds/settings/page.tsx",
      }),
    ).rejects.toThrow(/Invalid Ghost dialect/);
  });

  async function track(rootPromise: Promise<string>): Promise<string> {
    const root = await rootPromise;
    roots.push(root);
    return root;
  }
});

function hitReasons(
  result: Awaited<ReturnType<typeof gatherRelayContext>>,
  ref: string,
) {
  return result.selected_context.context_hits.find((hit) => hit.ref === ref)
    ?.why_selected;
}

async function createThreeLayerPostureSandbox(): Promise<string> {
  const root = join(
    tmpdir(),
    `ghost-relay-stack-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  await mkdir(join(root, "products", "seller", "payments"), {
    recursive: true,
  });
  await writeFile(
    join(root, "products", "seller", "payments", "review.tsx"),
    "",
  );

  await writeSplitFingerprintPackage(
    join(root, ".ghost"),
    `schema: ghost.fingerprint/v1
intent:
  summary:
    product: Block
    audience:
      - people moving money
    goals:
      - Protect money movement across perspectives.
  principles:
    - id: protect-money-movement
      principle: Money movement surfaces preserve confidence before commitment.
      applies_to:
        surface_types: [money-movement]
inventory:
  topology:
    scopes:
      - id: block-products
        paths: [products]
        surface_types: [money-movement]
composition:
  patterns: []
`,
  );

  await writeSplitFingerprintPackage(
    join(root, "products", "seller", ".ghost"),
    `schema: ghost.fingerprint/v1
intent:
  summary:
    audience:
      - sellers
    goals:
      - Help sellers understand operational state.
  principles:
    - id: seller-operational-confidence
      principle: Seller workflows make operational state and next action legible.
      applies_to:
        surface_types: [seller-workflow]
inventory:
  topology:
    scopes:
      - id: seller
        paths: [.]
        surface_types: [seller-workflow]
composition:
  patterns: []
`,
  );

  await writeSplitFingerprintPackage(
    join(root, "products", "seller", "payments", ".ghost"),
    `schema: ghost.fingerprint/v1
intent:
  summary:
    goals:
      - Make payout review reversible before commitment.
    anti_goals:
      - Hide payout timing until after action.
  situations:
    - id: payment-review
      user_intent: Confirm payout timing before taking action.
      product_obligation: Seller payment review keeps reversal and timing understandable.
      surface_type: money-movement
  principles: []
  experience_contracts: []
inventory:
  topology:
    scopes:
      - id: payment-review
        paths: [.]
        surface_types: [money-movement, seller-workflow]
composition:
  patterns:
    - id: reversible-payment-review
      kind: flow
      pattern: Payment review shows timing, consequence, and reversal before action.
      applies_to:
        paths: [.]
`,
    `schema: ghost.validate/v1
id: payment-review
checks:
  - id: no-hidden-timing
    title: Show payout timing
    status: active
    severity: serious
    derivation:
      intent: [intent.situation:payment-review]
    applies_to:
      paths: [.]
    detector:
      type: required-regex
      pattern: payout timing
    evidence:
      support: 0.9
      observed_count: 2
      examples:
        - review.tsx
`,
  );

  return root;
}

async function createLinkedReasonSandbox(): Promise<string> {
  const root = join(
    tmpdir(),
    `ghost-relay-linked-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  await mkdir(join(root, "app"), { recursive: true });
  await writeFile(join(root, "app", "page.tsx"), "");

  await writeSplitFingerprintPackage(
    join(root, ".ghost"),
    `schema: ghost.fingerprint/v1
intent:
  summary:
    product: Linked
  situations:
    - id: settings-task
      user_intent: Change settings.
      product_obligation: Keep linked panel visible.
      surface_type: settings
      patterns: [composition.pattern:linked-panel]
inventory:
  topology:
    scopes:
      - id: app
        paths: [app]
        surface_types: [settings]
composition:
  patterns:
    - id: linked-panel
      kind: layout
      pattern: Keep the linked panel beside the settings task.
`,
  );

  return root;
}

async function createSummaryOnlyPostureSandbox(): Promise<string> {
  const root = join(
    tmpdir(),
    `ghost-relay-summary-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  await mkdir(join(root, "app", "settings"), { recursive: true });
  await writeFile(join(root, "app", "settings", "page.tsx"), "");

  await writeSplitFingerprintPackage(
    join(root, ".ghost"),
    `schema: ghost.fingerprint/v1
intent:
  summary:
    product: Platform
    goals:
      - Preserve platform trust.
inventory:
  topology:
    scopes:
      - id: app
        paths: [app]
        surface_types: [settings]
composition:
  patterns: []
`,
  );

  await writeSplitFingerprintPackage(
    join(root, "app", ".ghost"),
    `schema: ghost.fingerprint/v1
intent:
  summary:
    product: Settings Console
    audience:
      - operators
    goals:
      - Make settings changes feel deliberate.
    anti_goals:
      - Turn settings into a marketing page.
  situations: []
  principles: []
  experience_contracts: []
inventory:
  topology:
    scopes:
      - id: settings
        paths: [settings]
        surface_types: [settings]
composition:
  patterns:
    - id: deliberate-settings-flow
      kind: flow
      pattern: Settings changes expose consequence before commitment.
      applies_to:
        surface_types: [settings]
`,
  );

  return root;
}

async function writeSplitFingerprintPackage(
  pkg: string,
  fingerprintRaw: string,
  checksRaw?: string,
): Promise<void> {
  const packageDir = pkg;
  const doc = parseYaml(fingerprintRaw) as Record<string, unknown>;
  await mkdir(packageDir, { recursive: true });
  await Promise.all([
    writeFile(
      join(packageDir, "manifest.yml"),
      "schema: ghost.fingerprint-package/v1\nid: local\n",
    ),
    writeFile(
      join(packageDir, "intent.yml"),
      stringifyYaml(
        doc.intent ?? {
          summary: {},
          situations: [],
          principles: [],
          experience_contracts: [],
        },
      ),
    ),
    writeFile(
      join(packageDir, "inventory.yml"),
      stringifyYaml(
        doc.inventory ?? {
          topology: {},
          building_blocks: {},
          exemplars: [],
          sources: [],
        },
      ),
    ),
    writeFile(
      join(packageDir, "composition.yml"),
      stringifyYaml(doc.composition ?? { patterns: [] }),
    ),
    ...(checksRaw
      ? [writeFile(join(packageDir, "validate.yml"), checksRaw)]
      : []),
  ]);
}

function relativeToSandbox(root: string, value: string): string {
  return value.replace(`${root}/`, "");
}
