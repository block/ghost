import { mkdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildCli } from "../src/cli.js";

const BASE_FINGERPRINT = `---
id: local
source: llm
timestamp: 2026-04-24T00:00:00.000Z
palette:
  dominant:
    - { role: primary, value: "#111111" }
  neutrals: { steps: ["#ffffff", "#111111"], count: 2 }
  semantic: []
  saturationProfile: muted
  contrast: high
spacing: { scale: [4, 8, 16], baseUnit: 4, regularity: 1 }
typography:
  families: ["Inter"]
  sizeRamp: [12, 16, 24]
  weightDistribution: { 400: 1 }
  lineHeightPattern: normal
surfaces:
  borderRadii: [4, 8]
  shadowComplexity: deliberate-none
  borderUsage: minimal
---

# Character

Quiet and direct.

# Decisions

### shape-language
Use modest radii.
`;

function fingerprintWithId(id: string): string {
  return BASE_FINGERPRINT.replace("id: local", `id: ${id}`);
}

async function runCli(
  argv: string[],
  cwd: string,
  options: { allowNoExit?: boolean } = {},
) {
  const cli = buildCli();
  const previousCwd = process.cwd();
  let stdout = "";
  let stderr = "";
  let exitCode: number | undefined;
  let finish: () => void = () => {};
  const done = new Promise<void>((resolve) => {
    finish = resolve;
  });

  const stdoutSpy = vi
    .spyOn(process.stdout, "write")
    .mockImplementation((chunk: string | Uint8Array) => {
      stdout += chunk.toString();
      return true;
    });
  const stderrSpy = vi
    .spyOn(process.stderr, "write")
    .mockImplementation((chunk: string | Uint8Array) => {
      stderr += chunk.toString();
      return true;
    });
  const logSpy = vi.spyOn(console, "log").mockImplementation((...args) => {
    stdout += `${args.join(" ")}\n`;
  });
  const errorSpy = vi.spyOn(console, "error").mockImplementation((...args) => {
    stderr += `${args.join(" ")}\n`;
  });
  const exitSpy = vi.spyOn(process, "exit").mockImplementation((code) => {
    exitCode = typeof code === "number" ? code : 0;
    finish();
    return undefined as never;
  });

  try {
    process.chdir(cwd);
    cli.parse(["node", "ghost", ...argv]);
    if (options.allowNoExit) {
      setTimeout(finish, 500);
    }
    await Promise.race([
      done,
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error("CLI command did not exit")), 2000),
      ),
    ]);
  } finally {
    process.chdir(previousCwd);
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
    logSpy.mockRestore();
    errorSpy.mockRestore();
    exitSpy.mockRestore();
  }

  return { stdout, stderr, code: exitCode ?? 0 };
}

describe("ghost CLI", () => {
  let dir: string;

  beforeEach(async () => {
    dir = join(
      tmpdir(),
      `ghost-cli-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await mkdir(dir, { recursive: true });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("prints top-level help for the unified ghost bin", async () => {
    const result = await runCli(["--help"], dir, { allowNoExit: true });

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("ghost");
    expect(result.stdout).toContain("skill");
  });

  it("compares explicitly supplied fingerprint files", async () => {
    await writeFile(join(dir, "a.fingerprint.md"), fingerprintWithId("a"));
    await writeFile(join(dir, "b.fingerprint.md"), fingerprintWithId("b"));

    const result = await runCli(
      ["compare", "a.fingerprint.md", "b.fingerprint.md"],
      dir,
    );

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Distance");
  });

  it("compares root fingerprint bundle directories", async () => {
    await writeComparableBundle(join(dir, "a", ".ghost"), "sectioned-form");
    await writeComparableBundle(join(dir, "b", ".ghost"), "data-table");

    const result = await runCli(["compare", "a/.ghost", "b/.ghost"], dir);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Distance");
  });

  it("track writes the neutral sync manifest shape", async () => {
    await mkdir(join(dir, ".ghost"), { recursive: true });
    await writeFile(
      join(dir, ".ghost", "fingerprint.md"),
      fingerprintWithId("local"),
    );
    await writeFile(
      join(dir, "tracked.fingerprint.md"),
      fingerprintWithId("tracked"),
    );

    const result = await runCli(["track", "tracked.fingerprint.md"], dir);
    const manifest = JSON.parse(
      await readFile(join(dir, ".ghost-sync.json"), "utf-8"),
    ) as Record<string, unknown>;

    expect(result.code).toBe(0);
    expect(manifest.tracks).toEqual({
      type: "path",
      value: "tracked.fingerprint.md",
    });
    expect(manifest.trackedFingerprintId).toBe("tracked");
    expect(manifest.localFingerprintId).toBe("local");
    const legacyRelationFields = [
      "parent",
      ["parent", "FingerprintId"].join(""),
      ["child", "FingerprintId"].join(""),
    ];
    for (const field of legacyRelationFields) {
      expect(manifest).not.toHaveProperty(field);
    }
  });

  it("ack and diverge write stance updates from the unified cli", async () => {
    await mkdir(join(dir, ".ghost"), { recursive: true });
    await writeFile(
      join(dir, ".ghost", "fingerprint.md"),
      fingerprintWithId("local"),
    );
    await writeFile(
      join(dir, "tracked.fingerprint.md"),
      fingerprintWithId("tracked"),
    );
    await writeFile(
      join(dir, "ghost.config.js"),
      "export default { tracks: './tracked.fingerprint.md' };\n",
    );

    const ack = await runCli(
      [
        "ack",
        "--stance",
        "aligned",
        "--reason",
        "baseline",
        "--format",
        "json",
      ],
      dir,
    );
    const diverge = await runCli(
      ["diverge", "typography", "--reason", "editorial", "--format", "json"],
      dir,
    );

    expect(ack.code).toBe(0);
    expect(JSON.parse(ack.stdout).trackedFingerprintId).toBe("tracked");
    expect(diverge.code).toBe(0);
    const manifest = JSON.parse(diverge.stdout);
    expect(manifest.dimensions.typography.stance).toBe("diverging");
    expect(manifest.dimensions.typography.reason).toBe("editorial");
  });

  it("initializes a bundle and reports scan state as json", async () => {
    const init = await runCli(["init", "--with-intent"], dir);
    const scan = await runCli(["scan", "--format", "json"], dir);

    expect(init.code).toBe(0);
    expect(
      await readFile(join(dir, ".ghost", "resources.yml"), "utf-8"),
    ).toContain("schema: ghost.resources/v1");
    expect(await readFile(join(dir, ".ghost", "intent.md"), "utf-8")).toContain(
      "# Intent",
    );
    expect(scan.code).toBe(0);
    const status = JSON.parse(scan.stdout);
    expect(status.resources.state).toBe("present");
    expect(status.map.state).toBe("present");
  });

  it("runs inventory, lint, and verify from the unified cli", async () => {
    await writeCheckPackage(dir);
    const inventory = await runCli(["inventory"], dir);
    const lint = await runCli(["lint"], dir);
    const verify = await runCli(["verify", ".ghost", "--root", "."], dir);

    expect(inventory.code).toBe(0);
    expect(await realpath(JSON.parse(inventory.stdout).root)).toBe(
      await realpath(dir),
    );
    expect(lint.code).toBe(0);
    expect(lint.stdout).toContain("0 error");
    expect(verify.code).toBe(0);
    expect(verify.stdout).toContain("0 error");
  });

  it("runs survey summary, catalog, and patterns from the unified cli", async () => {
    await writeComparableBundle(join(dir, ".ghost"), "sectioned-form");

    const summary = await runCli(
      ["survey", "summarize", ".ghost/survey.json"],
      dir,
    );
    const catalog = await runCli(
      ["survey", "catalog", ".ghost/survey.json", "--kind", "spacing"],
      dir,
    );
    const patterns = await runCli(
      ["survey", "patterns", ".ghost/survey.json", "--format", "json"],
      dir,
    );

    expect(summary.code).toBe(0);
    expect(summary.stdout).toContain("Survey Summary");
    expect(catalog.code).toBe(0);
    expect(catalog.stdout).toContain("spacing");
    expect(patterns.code).toBe(0);
    expect(JSON.parse(patterns.stdout).schema).toBe("ghost.patterns/v1");
  });

  it("runs survey fix-ids from the unified cli", async () => {
    await writeComparableBundle(join(dir, ".ghost"), "sectioned-form");

    const result = await runCli(
      [
        "survey",
        "fix-ids",
        ".ghost/survey.json",
        "-o",
        ".ghost/survey.fixed.json",
      ],
      dir,
    );

    expect(result.code).toBe(0);
    const fixed = JSON.parse(
      await readFile(join(dir, ".ghost", "survey.fixed.json"), "utf-8"),
    );
    expect(fixed.schema).toBe("ghost.survey/v2");
    expect(fixed.values[0].id).toBeTruthy();
  });

  it("emits review commands and context bundles from the unified cli", async () => {
    await writeCheckPackage(dir);
    await writeFile(
      join(dir, ".ghost", "fingerprint.md"),
      fingerprintWithId("local"),
    );

    const reviewCommand = await runCli(["emit", "review-command"], dir);
    const contextBundle = await runCli(["emit", "context-bundle"], dir);

    expect(reviewCommand.code).toBe(0);
    expect(reviewCommand.stdout).toContain("design-review.md");
    expect(contextBundle.code).toBe(0);
    expect(contextBundle.stdout).toContain("prompt.md");
  });

  it("installs the unified ghost skill bundle", async () => {
    const result = await runCli(
      ["skill", "install", "--dest", "skills/ghost"],
      dir,
    );

    expect(result.code).toBe(0);
    for (const path of [
      "SKILL.md",
      "references/scan.md",
      "references/review.md",
      "references/remediate.md",
      "references/brief.md",
    ]) {
      await expect(
        readFile(join(dir, "skills", "ghost", path), "utf-8"),
      ).resolves.toBeTruthy();
    }
  });

  it("check fails when an active deterministic check matches added lines", async () => {
    await writeCheckPackage(dir);
    await writeFile(
      join(dir, "change.patch"),
      lendingPatch("UIColor(#ffffff)"),
    );

    const result = await runCli(
      ["check", "--diff", "change.patch", "--format", "json"],
      dir,
    );

    expect(result.code).toBe(1);
    const report = JSON.parse(result.stdout);
    expect(report.result).toBe("fail");
    expect(report.findings[0]).toMatchObject({
      check_id: "no-hardcoded-ui-color",
      path: "Code/Features/Lending/View.swift",
      line: 1,
    });
  });

  it("check passes when active scoped checks do not match", async () => {
    await writeCheckPackage(dir);
    await writeFile(
      join(dir, "change.patch"),
      lendingPatch("let color = CashTheme.primary"),
    );

    const result = await runCli(["check", "--diff", "change.patch"], dir);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Design Check: PASS");
  });

  it("check passes when optional checks.yml is absent", async () => {
    await writeCheckPackage(dir, { checks: false });
    await writeFile(
      join(dir, "change.patch"),
      lendingPatch("UIColor(#ffffff)"),
    );

    const result = await runCli(["check", "--diff", "change.patch"], dir);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("No active deterministic check failures.");
  });

  it("review emits an advisory packet with required citation fields", async () => {
    await writeCheckPackage(dir);
    await writeFile(
      join(dir, "change.patch"),
      lendingPatch("let color = CashTheme.primary"),
    );

    const result = await runCli(["review", "--diff", "change.patch"], dir);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("# Ghost Advisory Review");
    expect(result.stdout).toContain("diff location");
    expect(result.stdout).toContain("patterns.yml composition pattern");
    expect(result.stdout).toContain("survey evidence");
    expect(result.stdout).toContain("intent.md when relevant");
    expect(result.stdout).toContain("precedent/example");
    expect(result.stdout).toContain("repair");
  });

  it("review omits product-experience memory by default", async () => {
    await writeCheckPackage(dir);
    await writeMemoryFiles(dir);
    await writeFile(
      join(dir, "change.patch"),
      lendingPatch("let color = CashTheme.primary"),
    );

    const result = await runCli(
      ["review", "--diff", "change.patch", "--format", "json"],
      dir,
    );

    expect(result.code).toBe(0);
    const packet = JSON.parse(result.stdout);
    expect(packet.memory).toBeUndefined();
  });

  it("review includes only accepted decisions when requested", async () => {
    await writeCheckPackage(dir);
    await writeMemoryFiles(dir);
    await writeFile(
      join(dir, "change.patch"),
      lendingPatch("let color = CashTheme.primary"),
    );

    const result = await runCli(
      [
        "review",
        "--diff",
        "change.patch",
        "--include-memory",
        "--format",
        "json",
      ],
      dir,
    );

    expect(result.code).toBe(0);
    const packet = JSON.parse(result.stdout);
    expect(packet.memory.decisions).toHaveLength(1);
    expect(packet.memory.decisions[0].id).toBe("checkout-reversibility");
    expect(JSON.stringify(packet.memory)).not.toContain("rejected-decision");
    expect(JSON.stringify(packet.memory)).not.toContain(
      "saved-payment-empty-state",
    );
  });
});

async function writeCheckPackage(
  dir: string,
  options: { checks?: boolean } = {},
): Promise<void> {
  const pkg = join(dir, ".ghost");
  await mkdir(pkg, { recursive: true });
  await writeFile(
    join(pkg, "resources.yml"),
    `schema: ghost.resources/v1
id: cash-ios
primary:
  target: .
`,
  );
  await writeFile(join(pkg, "map.md"), mapWithScopes());
  await writeFile(
    join(pkg, "survey.json"),
    JSON.stringify({
      schema: "ghost.survey/v2",
      sources: [{ target: ".", scanned_at: "2026-05-06T00:00:00.000Z" }],
      values: [],
      tokens: [],
      components: [],
      ui_surfaces: [],
    }),
  );
  await writeFile(
    join(pkg, "patterns.yml"),
    `schema: ghost.patterns/v1
id: cash-ios
surface_types: []
composition_patterns: []
`,
  );
  if (options.checks === false) return;

  await writeFile(
    join(pkg, "checks.yml"),
    `schema: ghost.checks/v1
id: cash-ios
checks:
  - id: no-hardcoded-ui-color
    title: Use design tokens for UI color
    status: active
    severity: serious
    applies_to:
      scopes: [lending]
      paths: [Code/Features/Lending]
    detector:
      type: forbidden-regex
      pattern: '#[0-9a-fA-F]{3,8}|UIColor\\('
      contexts: [swift]
    evidence:
      support: 0.94
      observed_count: 47
      examples:
        - Code/Features/Lending/LendingUI
    repair: Replace literals with Arcade/Cash semantic tokens.
`,
  );
}

async function writeMemoryFiles(dir: string): Promise<void> {
  const pkg = join(dir, ".ghost");
  await mkdir(join(pkg, "decisions"), { recursive: true });
  await mkdir(join(pkg, "proposals"), { recursive: true });
  await writeFile(
    join(pkg, "decisions", "checkout-reversibility.yml"),
    `schema: ghost.decision/v1
id: checkout-reversibility
status: accepted
title: Reversibility before money movement
claim: Payment review must make reversibility visible before final submission.
rationale: Users need confidence before committing money movement.
scope:
  roles: [design, engineering, pm, qa]
  scopes: [checkout]
  surface_types: [payment-review]
  pattern_ids: [confirmation-before-commit]
evidence:
  - path: apps/checkout/review.tsx
    note: Review step exposes edit affordances before submit.
decided_at: "2026-05-17T00:00:00.000Z"
`,
  );
  await writeFile(
    join(pkg, "decisions", "rejected-decision.yml"),
    `schema: ghost.decision/v1
id: rejected-decision
status: rejected
title: Rejected experience direction
claim: This should not appear in drift packets.
rationale: Rejected decisions are non-canonical memory.
evidence:
  - note: Rejected in design review.
decided_at: "2026-05-17T00:00:00.000Z"
`,
  );
  await writeFile(
    join(pkg, "proposals", "saved-payment-empty-state.yml"),
    `schema: ghost.proposal/v1
id: saved-payment-empty-state
status: accepted
kind: decision
title: Saved payment empty state should teach recovery
claim: Empty states for saved payment methods should prioritize recovery.
rationale: The user is blocked from paying, not browsing product concepts.
evidence:
  - path: apps/payments/empty-state.tsx
proposed_action:
  target: decisions
  summary: Promote into an accepted product-experience decision if repeated.
`,
  );
}

async function writeComparableBundle(
  pkg: string,
  patternId: string,
): Promise<void> {
  await mkdir(pkg, { recursive: true });
  await writeFile(
    join(pkg, "survey.json"),
    JSON.stringify({
      schema: "ghost.survey/v2",
      sources: [
        { id: patternId, target: ".", scanned_at: "2026-05-10T00:00:00Z" },
      ],
      values: [
        {
          id: `value_${patternId}`,
          source: { target: ".", scanned_at: "2026-05-10T00:00:00Z" },
          kind: "spacing",
          value: "8px",
          raw: "p-2",
          occurrences: 4,
          files_count: 2,
        },
      ],
      tokens: [],
      components: [],
      ui_surfaces: [
        {
          id: `surface_${patternId}`,
          source: { target: ".", scanned_at: "2026-05-10T00:00:00Z" },
          name: patternId,
          kind: "route",
          locator: `/${patternId}`,
          renderability: "source-only",
          files: [`src/${patternId}.tsx`],
          classification: { surface_type: "settings" },
          signals: { layout_patterns: [patternId] },
        },
      ],
    }),
  );
  await writeFile(
    join(pkg, "patterns.yml"),
    `schema: ghost.patterns/v1
id: ${patternId}
surface_types:
  - id: settings
    preferred_patterns: [${patternId}]
composition_patterns:
  - id: ${patternId}
    surface_types: [settings]
    evidence:
      - locator: /${patternId}
`,
  );
}

function lendingPatch(line: string): string {
  return `diff --git a/Code/Features/Lending/View.swift b/Code/Features/Lending/View.swift
--- a/Code/Features/Lending/View.swift
+++ b/Code/Features/Lending/View.swift
@@ -0,0 +1,1 @@
+${line}
`;
}

function mapWithScopes(): string {
  return `---
schema: ghost.map/v2
id: cash-ios
repo: squareup/cash-ios
mapped_at: 2026-05-06T00:00:00.000Z
platform: ios
languages:
  - { name: swift, files: 5, share: 1.0 }
build_system: bazel
package_manifests:
  - MODULE.bazel
composition:
  frameworks:
    - { name: swiftui }
  rendering: native
  styling:
    - design-tokens
design_system:
  paths:
    - Code/DesignSystem
  status: active
surface_sources:
  render_strategy: static-source
  include:
    - Code/Features/**
  exclude:
    - "**/Tests/**"
feature_areas:
  - name: lending
    paths:
      - Code/Features/Lending
scopes:
  - id: lending
    name: Lending
    kind: product-surface
    paths:
      - Code/Features/Lending
orientation_files:
  - README.md
---

## Identity

Cash iOS.

## Topology

Native Swift app.

## Conventions

Use feature scopes.
`;
}
