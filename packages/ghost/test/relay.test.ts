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
  const fingerprintDir = join(pkg, "fingerprint");
  const doc = parseYaml(fingerprintRaw) as Record<string, unknown>;
  await mkdir(fingerprintDir, { recursive: true });
  await Promise.all([
    writeFile(
      join(fingerprintDir, "manifest.yml"),
      "schema: ghost.fingerprint-package/v1\nid: local\n",
    ),
    writeFile(
      join(fingerprintDir, "intent.yml"),
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
      join(fingerprintDir, "inventory.yml"),
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
      join(fingerprintDir, "composition.yml"),
      stringifyYaml(doc.composition ?? { patterns: [] }),
    ),
    ...(checksRaw
      ? [writeFile(join(fingerprintDir, "validate.yml"), checksRaw)]
      : []),
  ]);
}

function relativeToSandbox(root: string, value: string): string {
  return value.replace(`${root}/`, "");
}
