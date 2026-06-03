import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  groupMemoryStacksForPaths,
  loadMemoryStackForPath,
} from "../src/scan/index.js";

describe("nested Ghost memory stacks", () => {
  let dir: string;

  beforeEach(async () => {
    dir = join(
      tmpdir(),
      `ghost-stack-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await mkdir(dir, { recursive: true });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("discovers root-to-leaf layers and merges child entries by id", async () => {
    await writeStackFixture(dir);

    const stack = await loadMemoryStackForPath(
      "apps/checkout/review/page.tsx",
      dir,
    );

    expect(stack.layers.map((layer) => layer.relative_root)).toEqual([
      ".",
      "apps/checkout",
    ]);
    expect(stack.provenance.layers).toHaveLength(2);
    expect(stack.merged.fingerprint.summary.product).toBe("Checkout");
    expect(stack.merged.fingerprint.summary.audience).toEqual([
      "operators",
      "buyers",
    ]);
    expect(stack.merged.fingerprint.topology.surface_types).toEqual(
      expect.arrayContaining(["app-shell", "payment-review"]),
    );
    expect(
      stack.merged.fingerprint.principles.find(
        (principle) => principle.id === "shared-principle",
      )?.principle,
    ).toBe("Checkout review must make reversal obvious.");
    expect(
      stack.merged.fingerprint.situations.find(
        (situation) => situation.id === "shared-situation",
      )?.user_intent,
    ).toBe("review checkout before committing payment");
    expect(stack.merged.fingerprint.topology.scopes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "checkout",
          paths: ["apps/checkout/review"],
        }),
      ]),
    );
    expect(
      stack.merged.fingerprint.patterns.find(
        (pattern) => pattern.id === "child-pattern",
      )?.evidence?.[0],
    ).toMatchObject({ path: "apps/checkout/review/page.tsx" });
    expect(
      stack.merged.checks.checks.find(
        (check) => check.id === "no-hardcoded-color",
      )?.status,
    ).toBe("disabled");
    expect(
      stack.merged.decisions.find(
        (decision) => decision.id === "shared-decision",
      )?.status,
    ).toBe("rejected");
  });

  it("groups changed files by resolved memory stack", async () => {
    await writeStackFixture(dir);

    const groups = await groupMemoryStacksForPaths(
      ["apps/checkout/review/page.tsx", "shared/home.tsx"],
      dir,
    );

    expect(groups).toHaveLength(2);
    expect(groups.map((group) => group.stack.layers.length).sort()).toEqual([
      1, 2,
    ]);
  });

  it("merges sparse parent and child fingerprints with normalized defaults", async () => {
    await mkdir(join(dir, ".ghost"), { recursive: true });
    await writeFile(
      join(dir, ".ghost", "fingerprint.yml"),
      "schema: ghost.fingerprint/v1\n",
    );
    await mkdir(join(dir, "apps", "checkout", ".ghost"), { recursive: true });
    await writeFile(
      join(dir, "apps", "checkout", ".ghost", "fingerprint.yml"),
      `schema: ghost.fingerprint/v1
summary:
  product: Checkout
principles:
  - id: checkout-review-stays-reversible
    principle: Checkout review keeps reversal visible before payment.
`,
    );

    const stack = await loadMemoryStackForPath(
      "apps/checkout/review/page.tsx",
      dir,
    );

    expect(stack.layers).toHaveLength(2);
    expect(stack.merged.fingerprint.summary.product).toBe("Checkout");
    expect(stack.merged.fingerprint.topology).toEqual({
      scopes: [],
      surface_types: undefined,
      examples: [],
    });
    expect(stack.merged.fingerprint.situations).toEqual([]);
    expect(stack.merged.fingerprint.principles).toHaveLength(1);
    expect(stack.merged.fingerprint.experience_contracts).toEqual([]);
    expect(stack.merged.fingerprint.patterns).toEqual([]);
    expect(stack.merged.fingerprint.implementation_vocabulary).toEqual({
      tokens: undefined,
      components: undefined,
      libraries: undefined,
      assets: undefined,
      notes: undefined,
    });
  });

  it("resolves root-to-leaf layers from a custom memory directory", async () => {
    await writeStackFixture(dir, ".design/memory");

    const stack = await loadMemoryStackForPath(
      "apps/checkout/review/page.tsx",
      dir,
      { memoryDir: ".design/memory" },
    );
    const groups = await groupMemoryStacksForPaths(
      ["apps/checkout/review/page.tsx", "shared/home.tsx"],
      dir,
      { memoryDir: ".design/memory" },
    );

    expect(stack.memory_dir).toBe(".design/memory");
    expect(stack.layers.map((layer) => layer.relative_root)).toEqual([
      ".",
      "apps/checkout",
    ]);
    expect(stack.layers.map((layer) => layer.memory_dir)).toEqual([
      ".design/memory",
      ".design/memory",
    ]);
    expect(groups).toHaveLength(2);
  });
});

async function writeStackFixture(
  dir: string,
  memoryDir = ".ghost",
): Promise<void> {
  await writeRootBundle(dir, memoryDir);
  await writeChildBundle(join(dir, "apps", "checkout"), memoryDir);
  await mkdir(join(dir, "shared"), { recursive: true });
  await writeFile(join(dir, "shared", "home.tsx"), "");
  await writeFile(join(dir, "apps", "checkout", "review", "page.tsx"), "");
}

async function writeRootBundle(
  dir: string,
  memoryDir = ".ghost",
): Promise<void> {
  const ghost = memoryPackagePath(dir, memoryDir);
  await mkdir(join(ghost, "decisions"), { recursive: true });
  await writeFile(
    join(ghost, "fingerprint.yml"),
    `schema: ghost.fingerprint/v1
summary:
  product: Root Product
  audience: [operators]
topology:
  scopes:
    - id: app
      paths: [apps]
  surface_types: [app-shell]
situations:
  - id: shared-situation
    user_intent: use the broad product
    product_obligation: preserve broad product continuity
principles:
  - id: shared-principle
    principle: Parent product memory.
experience_contracts: []
patterns:
  - id: root-pattern
    kind: visual
    pattern: Root pattern.
  - id: child-pattern
    kind: visual
    pattern: Parent version of child pattern.
implementation_vocabulary:
  tokens: [RootTheme.color]
`,
  );
  await writeFile(
    join(ghost, "checks.yml"),
    `schema: ghost.checks/v1
id: root
checks:
  - id: no-hardcoded-color
    title: No hardcoded colors
    status: active
    severity: serious
    derives_from: pattern:root-pattern
    applies_to:
      paths: [apps]
    detector:
      type: forbidden-regex
      pattern: '#[0-9a-fA-F]{3,8}'
      contexts: [react]
    evidence:
      support: 0.9
      observed_count: 3
      examples:
        - apps/example.tsx
`,
  );
  await writeFile(
    join(ghost, "decisions", "shared-decision.yml"),
    `schema: ghost.decision/v1
id: shared-decision
status: accepted
title: Parent decision
claim: Parent claim.
rationale: Parent rationale.
evidence:
  - note: Parent evidence.
decided_at: "2026-05-17T00:00:00.000Z"
`,
  );
}

async function writeChildBundle(
  root: string,
  memoryDir = ".ghost",
): Promise<void> {
  const ghost = memoryPackagePath(root, memoryDir);
  await mkdir(join(ghost, "decisions"), { recursive: true });
  await mkdir(join(root, "review"), { recursive: true });
  await writeFile(
    join(ghost, "fingerprint.yml"),
    `schema: ghost.fingerprint/v1
summary:
  product: Checkout
  audience: [buyers]
topology:
  scopes:
    - id: checkout
      paths: [review]
      surface_types: [payment-review]
situations:
  - id: shared-situation
    user_intent: review checkout before committing payment
    product_obligation: make edit and reversal paths visible
    surface_type: payment-review
principles:
  - id: shared-principle
    principle: Checkout review must make reversal obvious.
    applies_to:
      paths: [review]
experience_contracts: []
patterns:
  - id: child-pattern
    kind: behavioral
    pattern: Checkout keeps review controls visible.
    applies_to:
      paths: [review]
    evidence:
      - path: review/page.tsx
implementation_vocabulary:
  tokens: [CheckoutTheme.action]
`,
  );
  await writeFile(
    join(ghost, "checks.yml"),
    `schema: ghost.checks/v1
id: checkout
checks:
  - id: no-hardcoded-color
    title: No hardcoded colors
    status: disabled
    severity: serious
    detector:
      type: forbidden-regex
      pattern: '#[0-9a-fA-F]{3,8}'
  - id: checkout-theme-token
    title: Use checkout theme
    status: active
    severity: nit
    derives_from: pattern:child-pattern
    applies_to:
      paths: [review]
    detector:
      type: required-token
      value: CheckoutTheme
      contexts: [react]
    evidence:
      support: 0.92
      observed_count: 4
      examples:
        - review/page.tsx
`,
  );
  await writeFile(
    join(ghost, "decisions", "shared-decision.yml"),
    `schema: ghost.decision/v1
id: shared-decision
status: rejected
title: Child decision
claim: Child claim.
rationale: Child rationale.
evidence:
  - path: review/page.tsx
decided_at: "2026-05-18T00:00:00.000Z"
`,
  );
}

function memoryPackagePath(root: string, memoryDir: string): string {
  return join(root, ...memoryDir.split("/"));
}
