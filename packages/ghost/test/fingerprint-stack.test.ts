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

  it("discovers root-to-leaf layers; the contract is the root, not a merge", async () => {
    await writeStackFixture(dir);

    const stack = await loadFingerprintStackForPath(
      "apps/checkout/review/page.tsx",
      dir,
    );

    // Layers are still discovered root-to-leaf (binding discovery).
    expect(stack.layers.map((layer) => layer.relative_root)).toEqual([
      ".",
      "apps/checkout",
    ]);
    expect(stack.provenance.layers).toHaveLength(2);

    // One contract, many bindings: the contract is the ROOT package's
    // fingerprint, used as-is. Nesting binds; it does not merge child facets in.
    expect(stack.contract.dir).toBe(stack.layers[0].dir);
    expect(stack.contract.fingerprint.intent.summary.product).toBe(
      "Root Product",
    );
    // The child's own principle is NOT merged into the contract.
    expect(
      stack.contract.fingerprint.intent.principles.find(
        (principle) => principle.id === "shared-principle",
      )?.principle,
    ).toBe("Parent product layer.");
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

  it("uses the root contract as-is; a child package does not contribute its fingerprint", async () => {
    await mkdir(join(dir, ".ghost"), { recursive: true });
    await writeSplitFingerprintPackage(
      join(dir, ".ghost"),
      `schema: ghost.fingerprint/v1
intent:
  summary:
    product: Root Product
`,
    );
    await mkdir(join(dir, "apps", "checkout", ".ghost"), { recursive: true });
    await writeSplitFingerprintPackage(
      join(dir, "apps", "checkout", ".ghost"),
      `schema: ghost.fingerprint/v1
intent:
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

    // Both packages are discovered as layers...
    expect(stack.layers).toHaveLength(2);
    // ...but the contract is the ROOT, used as-is. The child's product and
    // principle are NOT merged in (nesting binds, it does not federate data).
    expect(stack.contract.fingerprint.intent.summary.product).toBe(
      "Root Product",
    );
    expect(stack.contract.fingerprint.intent.principles).toEqual([]);
  });

  it("resolves root-to-leaf layers from a custom fingerprint directory", async () => {
    await writeStackFixture(dir, ".design/memory");

    const stack = await loadFingerprintStackForPath(
      "apps/checkout/review/page.tsx",
      dir,
      { ghostDir: ".design/memory" },
    );
    const groups = await groupFingerprintStacksForPaths(
      ["apps/checkout/review/page.tsx", "shared/home.tsx"],
      dir,
      { ghostDir: ".design/memory" },
    );

    expect(stack.ghost_dir).toBe(".design/memory");
    expect(stack.layers.map((layer) => layer.relative_root)).toEqual([
      ".",
      "apps/checkout",
    ]);
    expect(stack.layers.map((layer) => layer.ghost_dir)).toEqual([
      ".design/memory",
      ".design/memory",
    ]);
    expect(groups).toHaveLength(2);
  });
});

async function writeStackFixture(
  dir: string,
  ghostDir = ".ghost",
): Promise<void> {
  await writeRootBundle(dir, ghostDir);
  await writeChildBundle(join(dir, "apps", "checkout"), ghostDir);
  await mkdir(join(dir, "shared"), { recursive: true });
  await writeFile(join(dir, "shared", "home.tsx"), "");
  await writeFile(join(dir, "apps", "checkout", "review", "page.tsx"), "");
}

async function writeRootBundle(
  dir: string,
  ghostDir = ".ghost",
): Promise<void> {
  const ghost = packagePath(dir, ghostDir);
  await writeSplitFingerprintPackage(
    ghost,
    `schema: ghost.fingerprint/v1
intent:
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
  exemplars:
    - id: shared-exemplar
      path: apps/root.tsx
      title: Parent exemplar
      surface: app
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
    `schema: ghost.validate/v1
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
  ghostDir = ".ghost",
): Promise<void> {
  const ghost = packagePath(root, ghostDir);
  await mkdir(join(root, "review"), { recursive: true });
  await writeSplitFingerprintPackage(
    ghost,
    `schema: ghost.fingerprint/v1
intent:
  summary:
    product: Checkout
    audience: [buyers]
  situations:
    - id: shared-situation
      user_intent: review checkout before committing payment
      product_obligation: make edit and reversal paths visible
      surface: checkout
  principles:
    - id: shared-principle
      principle: Checkout review must make reversal obvious.
      surface: checkout
  experience_contracts: []
inventory:
  exemplars:
    - id: shared-exemplar
      path: review/page.tsx
      title: Child review exemplar
      surface: checkout
      refs: [composition.pattern:child-pattern]
  building_blocks:
    tokens: [CheckoutTheme.action]
composition:
  patterns:
    - id: child-pattern
      kind: behavior
      pattern: Checkout keeps review controls visible.
      surface: checkout
      evidence:
        - path: review/page.tsx
`,
    `schema: ghost.validate/v1
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

function packagePath(root: string, ghostDir: string): string {
  return join(root, ...ghostDir.split("/"));
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
