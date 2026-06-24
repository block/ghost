import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import {
  GHOST_RELAY_REQUEST_SCHEMA,
  gatherRelayContext,
  parseGhostRelayRequest,
} from "../src/relay.js";
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
    expect(result.context.schema).toBe("ghost.relay-context/v1");
    expect(result).not.toHaveProperty("context_packet");
    expect(result.context.target).toMatchObject({
      mode: "generation",
      paths: ["apps/refunds/settings/page.tsx"],
    });
    expect(result.context.config).toMatchObject({
      id: "ghost.default/v1",
      source: "default",
    });
    expect(result.context.sections.intent).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ref: "intent.principle:refund-trust",
          source: "intent.yml",
        }),
      ]),
    );
    expect(result.context.sections.composition).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ref: "composition.pattern:refund-disclosure",
          source: "composition.yml",
        }),
      ]),
    );
    expect(result.context.sections.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ref: "validate.check:no-hardcoded-ui-color",
          source: "validate.yml",
        }),
      ]),
    );
    expect(result.context.trace.selected).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "composition.yml",
          section: "composition",
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

  it("projects declared custom questions, sources, and extras", async () => {
    const root = await track(createSingleSurfaceSandbox());
    await mkdir(join(root, "product"), { recursive: true });
    await writeFile(
      join(root, ".ghost", "relay.yml"),
      `schema: ghost.relay-config/v1
id: acme.product-surface/v1
profile: ghost.product-surface/v1
sources:
  - id: product-questions
    path: product/questions.yml
    section: questions
    items: questions
    summary: question
    include:
      - blocks
    max_chars: 4000
  - id: product-sources
    path: product/sources.yml
    section: sources
    items: sources
    summary: summary
  - id: brand-voice
    path: product/brand.yml
    section: extra:brand_voice
    items: guidance
    summary: summary
  - id: internal-questions
    path: product/internal.yml
    section: questions
    visibility: internal
    items: questions
    summary: question
  - id: schema-only
    path: product/schema-only.yml
    section: questions
    items: questions
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
    });

    expect(result.context.config).toMatchObject({
      id: "acme.product-surface/v1",
      source: "file",
    });
    expect(result.context.target).toMatchObject({
      mode: "generation",
    });
    expect(result.context.sections.questions).toEqual([
      expect.objectContaining({
        id: "refund-policy",
        source: "product/questions.yml",
        summary: "Should refunds require manager approval?",
        content: { blocks: ["final copy"] },
      }),
    ]);
    expect(result.context.sections.sources).toEqual([
      expect.objectContaining({
        id: "design-registry",
        source: "product/sources.yml",
        summary: "Registry source for refund settings.",
      }),
    ]);
    expect(result.context.extras.brand_voice).toEqual([
      expect.objectContaining({
        id: "plain-language",
        source: "product/brand.yml",
        summary: "Use plain operational language.",
      }),
    ]);
    expect(result.context.trace.selected).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "product/questions.yml",
          section: "questions",
          source_id: "product-questions",
        }),
        expect.objectContaining({
          source: "product/sources.yml",
          section: "sources",
          source_id: "product-sources",
        }),
        expect.objectContaining({
          source: "product/brand.yml",
          section: "extra:brand_voice",
          source_id: "brand-voice",
        }),
      ]),
    );
    expect(result.context.trace.skipped).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source_id: "internal-questions",
          reason: ["visibility is internal"],
        }),
        expect.objectContaining({
          source_id: "schema-only",
          reason: ["items 'questions' was not found"],
        }),
      ]),
    );
  });

  it("accepts structured Relay requests", () => {
    const request = parseGhostRelayRequest({
      schema: GHOST_RELAY_REQUEST_SCHEMA,
      task: "generate-interface",
      prompt: "Generate a subscriber email interface.",
      target_paths: ["apps/portal/page.tsx"],
      selectors: {
        customer: "subscriber",
        system: "portal",
        medium: "email",
      },
      constraints: {
        output: "interface",
      },
    });

    expect(request).toMatchObject({
      schema: "ghost.relay-request/v1",
      task: "generate-interface",
      selectors: {
        customer: "subscriber",
        system: "portal",
        medium: "email",
      },
    });
  });

  it("resolves a Relay request to a declared stack and projects ordered unit sources", async () => {
    const root = await track(createRelayRequestStackSandbox());

    const result = await gatherRelayContext({
      cwd: root,
      request: {
        schema: GHOST_RELAY_REQUEST_SCHEMA,
        task: "generate-interface",
        prompt:
          "Generate the right interface for a subscriber renewal reminder in portal email.",
        selectors: {
          customer: "subscriber",
          system: "portal",
          moment: "renewal-reminder",
          medium: "email",
          capability: "billing",
        },
      },
    });

    expect(result.schema).toBe("ghost.relay.gather/v2");
    expect(result.source.kind).toBe("request-stack");
    expect(result.source).toMatchObject({
      stack: {
        id: "portal.renewal-reminder.email",
        path: "stacks/portal.renewal-reminder.email.yml",
        units: ["systems/portal", "media/email", "capabilities/billing"],
        matched_selectors: [
          "customer",
          "system",
          "moment",
          "medium",
          "capability",
        ],
      },
    });
    expect(result.context.target.request).toMatchObject({
      schema: "ghost.relay-request/v1",
      task: "generate-interface",
      selectors: {
        customer: "subscriber",
        system: "portal",
        moment: "renewal-reminder",
        medium: "email",
        capability: "billing",
      },
    });
    expect(result.context.extras.resolved_stack).toEqual([
      expect.objectContaining({
        id: "portal.renewal-reminder.email",
        source: "stacks/portal.renewal-reminder.email.yml",
      }),
    ]);
    expect(result.context.sections.questions).toEqual([
      expect.objectContaining({
        id: "email-sensitive-detail",
        source: "media/email/questions.yml",
        source_id: "demo-stacks:media.email:unit-questions",
        summary: "What sensitive detail is safe in email?",
      }),
    ]);
    expect(result.context.sections.sources).toEqual([
      expect.objectContaining({
        id: "portal-principles",
        source: "systems/portal/sources.yml",
        summary: "Portal research principles.",
      }),
    ]);
    expect(result.context.extras.composition).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "email-route-to-detail",
          source: "media/email/composition.yml",
          summary: "Email previews route to authenticated detail.",
        }),
      ]),
    );
    expect(result.context.trace.selected).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "relay-request",
          section: "extra:relay_request",
          source_id: "relay-request",
        }),
        expect.objectContaining({
          source: "stacks/portal.renewal-reminder.email.yml",
          section: "extra:resolved_stack",
          source_id: "demo-stacks",
        }),
        expect.objectContaining({
          source: "media/email/questions.yml",
          section: "questions",
        }),
      ]),
    );
    expect(result.context.trace.skipped).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "capabilities/billing/questions.yml",
          reason: ["source file not found"],
        }),
      ]),
    );
    expect(result).not.toHaveProperty("context_packet");
  });

  it("does not silently guess when Relay request selectors are ambiguous", async () => {
    const root = await track(createRelayRequestStackSandbox());

    const result = await gatherRelayContext({
      cwd: root,
      request: {
        schema: GHOST_RELAY_REQUEST_SCHEMA,
        task: "answer",
        selectors: {
          system: "portal",
        },
      },
    });

    expect(result.source.kind).toBe("request");
    expect(result.source).toMatchObject({
      reason: "ambiguous",
    });
    expect(result.context.gaps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "request-ambiguous",
        }),
      ]),
    );
    expect(result.context.sections.questions).toEqual([]);
    expect(result.context.trace.skipped).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          section: "extra:resolved_stack",
          reason: ["ambiguous Relay request match"],
        }),
      ]),
    );
  });

  it("uses an explicit Relay config over the discovered config", async () => {
    const root = await track(createSingleSurfaceSandbox());
    await mkdir(join(root, "product"), { recursive: true });
    await writeFile(
      join(root, ".ghost", "relay.yml"),
      `schema: ghost.relay-config/v1
id: discovered/v1
sources: []
`,
    );
    await writeFile(
      join(root, "product", "relay.yml"),
      `schema: ghost.relay-config/v1
id: explicit/v1
sources:
  - id: product-questions
    path: product/questions.yml
    section: questions
    items: questions
    summary: question
`,
    );
    await writeFile(
      join(root, "product", "questions.yml"),
      `questions:
  - id: refund-policy
    question: Should refunds require manager approval?
`,
    );

    const result = await gatherRelayContext({
      cwd: root,
      target: "apps/refunds/settings/page.tsx",
      config: "product/relay.yml",
    });

    expect(result.context.config).toMatchObject({
      id: "explicit/v1",
      source: "file",
    });
    expect(result.context.sections.questions).toEqual([
      expect.objectContaining({
        id: "refund-policy",
        summary: "Should refunds require manager approval?",
      }),
    ]);
  });

  it("rejects unnamespaced extra sections", async () => {
    const root = await track(createSingleSurfaceSandbox());
    await writeFile(
      join(root, ".ghost", "relay.yml"),
      `schema: ghost.relay-config/v1
id: acme.invalid/v1
sources:
  - id: invalid-extra
    path: product/brand.yml
    section: brand_voice
    summary: summary
`,
    );

    await expect(
      gatherRelayContext({
        cwd: root,
        target: "apps/refunds/settings/page.tsx",
      }),
    ).rejects.toThrow(/Invalid Ghost Relay config/);
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

async function createRelayRequestStackSandbox(): Promise<string> {
  const root = await createSingleSurfaceSandbox();
  await mkdir(join(root, "stacks"), { recursive: true });
  await mkdir(join(root, "systems", "portal"), { recursive: true });
  await mkdir(join(root, "media", "email"), { recursive: true });
  await mkdir(join(root, "media", "sms"), { recursive: true });
  await mkdir(join(root, "capabilities", "billing"), { recursive: true });
  await writeFile(
    join(root, ".ghost", "relay.yml"),
    `schema: ghost.relay-config/v1
id: demo.product-surface/v1
profile: ghost.product-surface/v1
sources: []
request_resolvers:
  - id: demo-stacks
    kind: stack
    files:
      - stacks/*.yml
    schema: demo.stack/v1
    unit_sources:
      - id: unit-questions
        path: "{unit}/questions.yml"
        section: questions
        items: questions
        summary: question
        include:
          - risk
      - id: unit-sources
        path: "{unit}/sources.yml"
        section: sources
        items: sources
        summary: summary
      - id: unit-composition
        path: "{unit}/composition.yml"
        section: extra:composition
        items: patterns
        summary: pattern
`,
  );
  await writeFile(
    join(root, "stacks", "portal.renewal-reminder.email.yml"),
    `schema: demo.stack/v1
id: portal.renewal-reminder.email
title: Portal renewal reminder via email
status: draft
purpose: Resolve context for portal email.
task_context:
  customer: subscriber
  system: systems.portal
  moment: moments.subscription-renewal-reminder
  medium: media.email
  capability: capabilities.billing
units:
  - systems/portal
  - media/email
  - capabilities/billing
`,
  );
  await writeFile(
    join(root, "stacks", "portal.renewal-reminder.sms.yml"),
    `schema: demo.stack/v1
id: portal.renewal-reminder.sms
title: Portal renewal reminder via SMS
status: draft
purpose: Resolve context for portal SMS.
task_context:
  customer: subscriber
  system: systems.portal
  moment: moments.subscription-renewal-reminder
  medium: media.sms
  capability: capabilities.billing
units:
  - systems/portal
  - media/sms
  - capabilities/billing
`,
  );
  await writeFile(
    join(root, "systems", "portal", "sources.yml"),
    `sources:
  - id: portal-principles
    summary: Portal research principles.
`,
  );
  await writeFile(
    join(root, "media", "email", "questions.yml"),
    `questions:
  - id: email-sensitive-detail
    question: What sensitive detail is safe in email?
    risk: Email can overexpose private account context.
`,
  );
  await writeFile(
    join(root, "media", "email", "composition.yml"),
    `patterns:
  - id: email-route-to-detail
    pattern: Email previews route to authenticated detail.
`,
  );
  await writeFile(
    join(root, "media", "sms", "questions.yml"),
    `questions:
  - id: sms-explanation-depth
    question: How much context should SMS show inline?
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
