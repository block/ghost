import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import {
  groupFingerprintStacksForPaths,
  loadFingerprintStackForPath,
} from "../src/scan/index.js";

describe("nested Ghost fingerprint stacks", () => {
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

    const stack = await loadFingerprintStackForPath(
      "apps/checkout/review/page.tsx",
      dir,
    );

    expect(stack.layers.map((layer) => layer.relative_root)).toEqual([
      ".",
      "apps/checkout",
    ]);
    expect(stack.provenance.layers).toHaveLength(2);
    expect(stack.merged.fingerprint.prose.summary.product).toBe("Checkout");
    expect(stack.merged.fingerprint.prose.summary.audience).toEqual([
      "operators",
      "buyers",
    ]);
    expect(stack.merged.fingerprint.inventory.topology.surface_types).toEqual(
      expect.arrayContaining(["app-shell", "payment-review"]),
    );
    expect(
      stack.merged.fingerprint.prose.principles.find(
        (principle) => principle.id === "shared-principle",
      )?.principle,
    ).toBe("Checkout review must make reversal obvious.");
    expect(
      stack.merged.fingerprint.prose.situations.find(
        (situation) => situation.id === "shared-situation",
      )?.user_intent,
    ).toBe("review checkout before committing payment");
    expect(stack.merged.fingerprint.inventory.topology.scopes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "checkout",
          paths: ["apps/checkout/review"],
        }),
      ]),
    );
    expect(
      stack.merged.fingerprint.composition.patterns.find(
        (pattern) => pattern.id === "child-pattern",
      )?.evidence?.[0],
    ).toMatchObject({ path: "apps/checkout/review/page.tsx" });
    expect(
      stack.merged.fingerprint.inventory.exemplars.find(
        (exemplar) => exemplar.id === "shared-exemplar",
      ),
    ).toMatchObject({
      title: "Child review exemplar",
      path: "apps/checkout/review/page.tsx",
      scope: "checkout",
      surface_type: "payment-review",
    });
    expect(
      stack.merged.checks.checks.find(
        (check) => check.id === "no-hardcoded-color",
      )?.status,
    ).toBe("disabled");
  });

  it("groups changed files by resolved fingerprint stack", async () => {
    await writeStackFixture(dir);

    const groups = await groupFingerprintStacksForPaths(
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
    await writeSplitFingerprintPackage(
      join(dir, ".ghost"),
      "schema: ghost.fingerprint/v1\n",
    );
    await mkdir(join(dir, "apps", "checkout", ".ghost"), { recursive: true });
    await writeSplitFingerprintPackage(
      join(dir, "apps", "checkout", ".ghost"),
      `schema: ghost.fingerprint/v1
prose:
  summary:
    product: Checkout
  principles:
    - id: checkout-review-stays-reversible
      principle: Checkout review keeps reversal visible before payment.
`,
    );

    const stack = await loadFingerprintStackForPath(
      "apps/checkout/review/page.tsx",
      dir,
    );

    expect(stack.layers).toHaveLength(2);
    expect(stack.merged.fingerprint.prose.summary.product).toBe("Checkout");
    expect(stack.merged.fingerprint.inventory.topology).toEqual({
      scopes: [],
      surface_types: undefined,
    });
    expect(stack.merged.fingerprint.prose.situations).toEqual([]);
    expect(stack.merged.fingerprint.prose.principles).toHaveLength(1);
    expect(stack.merged.fingerprint.prose.experience_contracts).toEqual([]);
    expect(stack.merged.fingerprint.composition.patterns).toEqual([]);
    expect(stack.merged.fingerprint.inventory.exemplars).toEqual([]);
    expect(stack.merged.fingerprint.inventory.building_blocks).toEqual({
      tokens: undefined,
      components: undefined,
      libraries: undefined,
      assets: undefined,
      routes: undefined,
      files: undefined,
      notes: undefined,
    });
  });

  it("resolves root-to-leaf layers from a custom fingerprint directory", async () => {
    await writeStackFixture(dir, ".design/memory");

    const stack = await loadFingerprintStackForPath(
      "apps/checkout/review/page.tsx",
      dir,
      { memoryDir: ".design/memory" },
    );
    const groups = await groupFingerprintStacksForPaths(
      ["apps/checkout/review/page.tsx", "shared/home.tsx"],
      dir,
      { memoryDir: ".design/memory" },
    );

    expect(stack.fingerprint_dir).toBe(".design/memory");
    expect(stack.layers.map((layer) => layer.relative_root)).toEqual([
      ".",
      "apps/checkout",
    ]);
    expect(stack.layers.map((layer) => layer.fingerprint_dir)).toEqual([
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
  await writeSplitFingerprintPackage(
    ghost,
    `schema: ghost.fingerprint/v1
prose:
  summary:
    product: Root Product
    audience: [operators]
  situations:
    - id: shared-situation
      user_intent: use the broad product
      product_obligation: preserve broad product continuity
  principles:
    - id: shared-principle
      principle: Parent product layer.
  experience_contracts: []
inventory:
  topology:
    scopes:
      - id: app
        paths: [apps]
    surface_types: [app-shell]
  exemplars:
    - id: shared-exemplar
      path: apps/root.tsx
      title: Parent exemplar
      surface_type: app-shell
      scope: app
      refs: [composition.pattern:root-pattern]
  building_blocks:
    tokens: [RootTheme.color]
composition:
  patterns:
    - id: root-pattern
      kind: visual
      pattern: Root pattern.
    - id: child-pattern
      kind: visual
      pattern: Parent version of child pattern.
`,
    `schema: ghost.checks/v1
id: root
checks:
  - id: no-hardcoded-color
    title: No hardcoded colors
    status: active
    severity: serious
    derivation:
      composition: [composition.pattern:root-pattern]
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
}

async function writeChildBundle(
  root: string,
  memoryDir = ".ghost",
): Promise<void> {
  const ghost = memoryPackagePath(root, memoryDir);
  await mkdir(join(root, "review"), { recursive: true });
  await writeSplitFingerprintPackage(
    ghost,
    `schema: ghost.fingerprint/v1
prose:
  summary:
    product: Checkout
    audience: [buyers]
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
inventory:
  topology:
    scopes:
      - id: checkout
        paths: [review]
        surface_types: [payment-review]
  exemplars:
    - id: shared-exemplar
      path: review/page.tsx
      title: Child review exemplar
      surface_type: payment-review
      scope: checkout
      refs: [composition.pattern:child-pattern]
  building_blocks:
    tokens: [CheckoutTheme.action]
composition:
  patterns:
    - id: child-pattern
      kind: behavior
      pattern: Checkout keeps review controls visible.
      applies_to:
        paths: [review]
      evidence:
        - path: review/page.tsx
`,
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
    derivation:
      composition: [composition.pattern:child-pattern]
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
}

function memoryPackagePath(root: string, memoryDir: string): string {
  return join(root, ...memoryDir.split("/"));
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
      join(fingerprintDir, "prose.yml"),
      stringifyYaml(
        doc.prose ?? {
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
      ? [writeFile(join(fingerprintDir, "checks.yml"), checksRaw)]
      : []),
  ]);
}
