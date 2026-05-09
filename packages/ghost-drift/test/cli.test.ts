import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
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

async function runCli(argv: string[], cwd: string) {
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
    cli.parse(["node", "ghost-drift", ...argv]);
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

describe("ghost-drift CLI", () => {
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

  it("track writes the neutral sync manifest shape", async () => {
    await mkdir(join(dir, ".ghost", "fingerprint"), { recursive: true });
    await writeFile(
      join(dir, ".ghost", "fingerprint", "profile.md"),
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

  it("emit review-command is no longer accepted by drift", async () => {
    const result = await runCli(["emit", "review-command"], dir);

    expect(result.code).toBe(2);
    expect(result.stderr).toContain(
      "unknown emit kind 'review-command'. Supported: skill.",
    );
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

  it("check infers a source-backed repair hint for Tailwind arbitrary colors", async () => {
    await writeTailwindCheckPackage(dir);
    await writeButtonSource(dir, [
      "const buttonVariants = {",
      "  default: 'bg-primary text-primary-foreground hover:bg-primary/80 active:opacity-50',",
      "  demo: 'bg-[#ff00ff] text-white hover:bg-[#cc00cc] active:opacity-50',",
      "};",
    ]);
    await writeFile(
      join(dir, "change.patch"),
      buttonPatch(
        "  demo: 'bg-[#ff00ff] text-white hover:bg-[#cc00cc] active:opacity-50',",
      ),
    );

    const result = await runCli(
      ["check", "--diff", "change.patch", "--format", "json"],
      dir,
    );

    expect(result.code).toBe(1);
    const report = JSON.parse(result.stdout);
    expect(report.findings[0].repair_hints).toEqual([
      {
        kind: "tailwind-class-replacement",
        replacement: "bg-primary text-primary-foreground hover:bg-primary/80",
        reason: "Found an existing same-file semantic Button action pattern.",
        inferred_from: "same-file-class-pattern",
        source: {
          path: "src/components/button.tsx",
          line: 2,
        },
        confidence: "high",
      },
    ]);
  });

  it("does not infer a Tailwind repair hint without a semantic candidate", async () => {
    await writeTailwindCheckPackage(dir);
    await writeButtonSource(dir, [
      "const buttonVariants = {",
      "  demo: 'bg-[#ff00ff] text-white hover:bg-[#cc00cc] active:opacity-50',",
      "};",
    ]);
    await writeFile(
      join(dir, "change.patch"),
      buttonPatch(
        "  demo: 'bg-[#ff00ff] text-white hover:bg-[#cc00cc] active:opacity-50',",
      ),
    );

    const result = await runCli(
      ["check", "--diff", "change.patch", "--format", "json"],
      dir,
    );

    expect(result.code).toBe(1);
    const report = JSON.parse(result.stdout);
    expect(report.findings[0]).not.toHaveProperty("repair_hints");
  });

  it("does not infer a Tailwind repair hint from arbitrary-value candidates", async () => {
    await writeTailwindCheckPackage(dir);
    await writeButtonSource(dir, [
      "const buttonVariants = {",
      "  default: 'bg-[#112233] text-white hover:bg-[#223344] active:opacity-50',",
      "  demo: 'bg-[#ff00ff] text-white hover:bg-[#cc00cc] active:opacity-50',",
      "};",
    ]);
    await writeFile(
      join(dir, "change.patch"),
      buttonPatch(
        "  demo: 'bg-[#ff00ff] text-white hover:bg-[#cc00cc] active:opacity-50',",
      ),
    );

    const result = await runCli(
      ["check", "--diff", "change.patch", "--format", "json"],
      dir,
    );

    expect(result.code).toBe(1);
    const report = JSON.parse(result.stdout);
    expect(report.findings[0]).not.toHaveProperty("repair_hints");
  });

  it("keeps generic repair behavior for unsupported findings", async () => {
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
    expect(report.findings[0]).toMatchObject({
      repair: "Replace literals with Arcade/Cash semantic tokens.",
    });
    expect(report.findings[0]).not.toHaveProperty("repair_hints");
  });

  it("prints Tailwind repair hints in markdown output", async () => {
    await writeTailwindCheckPackage(dir);
    await writeButtonSource(dir, [
      "const buttonVariants = {",
      "  default: 'bg-primary text-primary-foreground hover:bg-primary/80 active:opacity-50',",
      "  demo: 'bg-[#ff00ff] text-white hover:bg-[#cc00cc] active:opacity-50',",
      "};",
    ]);
    await writeFile(
      join(dir, "change.patch"),
      buttonPatch(
        "  demo: 'bg-[#ff00ff] text-white hover:bg-[#cc00cc] active:opacity-50',",
      ),
    );

    const result = await runCli(["check", "--diff", "change.patch"], dir);

    expect(result.code).toBe(1);
    expect(result.stdout).toContain(
      "Use instead: `bg-primary text-primary-foreground hover:bg-primary/80`",
    );
    expect(result.stdout).toContain(
      "Why: Found an existing same-file semantic Button action pattern.",
    );
    expect(result.stdout).toContain("Source: src/components/button.tsx:2");
  });

  it("check carries check-authored repair hints with multiple sources", async () => {
    await writeComponentPatternCheckPackage(dir);
    await writeFile(
      join(dir, "change.patch"),
      componentPatternPatch('<div className="flex justify-end gap-2">'),
    );

    const result = await runCli(
      ["check", "--diff", "change.patch", "--format", "json"],
      dir,
    );

    expect(result.code).toBe(1);
    const report = JSON.parse(result.stdout);
    expect(report.findings[0]).toMatchObject({
      check_id: "use-managerbot-tool-footer-actions",
      repair_hints: [
        {
          kind: "component-pattern-replacement",
          replacement:
            "ToolCardFooter + ToolFooterActions + ToolCancelButton + ToolSubmitButton",
          reason:
            "Found the same approval-card footer pattern in sibling tools.",
          inferred_from: "sibling-file-pattern",
          source: {
            path: "src/components/tools/square-update-preview/square-update-preview-ui.tsx",
            line: 425,
          },
          sources: [
            {
              path: "src/components/tools/square-update-preview/square-update-preview-ui.tsx",
              line: 425,
            },
            {
              path: "src/components/tools/square-remove-preview/square-remove-preview-ui.tsx",
              line: 298,
            },
          ],
          confidence: "high",
        },
      ],
    });
  });

  it("prints check-authored repair hint sources in markdown output", async () => {
    await writeComponentPatternCheckPackage(dir);
    await writeFile(
      join(dir, "change.patch"),
      componentPatternPatch('<div className="flex justify-end gap-2">'),
    );

    const result = await runCli(["check", "--diff", "change.patch"], dir);

    expect(result.code).toBe(1);
    expect(result.stdout).toContain(
      "Use instead: `ToolCardFooter + ToolFooterActions + ToolCancelButton + ToolSubmitButton`",
    );
    expect(result.stdout).toContain(
      "Sources: src/components/tools/square-update-preview/square-update-preview-ui.tsx:425, src/components/tools/square-remove-preview/square-remove-preview-ui.tsx:298",
    );
  });

  it("github-comment dry-run groups inline comments by changed line", async () => {
    await writeTailwindCheckPackage(dir);
    await writeButtonSource(dir, [
      "const buttonVariants = {",
      "  default: 'bg-primary text-primary-foreground hover:bg-primary/80 active:opacity-50',",
      "  demo: 'bg-[#ff00ff] text-white hover:bg-[#cc00cc] active:opacity-50',",
      "};",
    ]);
    await writeFile(
      join(dir, "change.patch"),
      buttonPatch(
        "  demo: 'bg-[#ff00ff] text-white hover:bg-[#cc00cc] active:opacity-50',",
      ),
    );

    const result = await runCli(
      [
        "github-comment",
        "--repo",
        "squareup/square-web",
        "--pr",
        "123",
        "--diff",
        "change.patch",
        "--dry-run",
      ],
      dir,
    );

    expect(result.code).toBe(1);
    expect(result.stdout).toContain("🤖 **Ghost drift check**");
    expect(result.stdout).toContain(
      "Found 2 deterministic drift match(es) across 1 changed line(s)",
    );
    expect(result.stdout).toContain(
      "--- Inline comment: src/components/button.tsx:3 ---",
    );
    expect(result.stdout).toContain("Matched: `#ff00ff`, `#cc00cc`.");
    expect(result.stdout).toContain(
      "Use instead: `bg-primary text-primary-foreground hover:bg-primary/80`",
    );
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
    expect(result.stdout).toContain("profile section");
    expect(result.stdout).toContain("survey evidence");
    expect(result.stdout).toContain("precedent/example");
    expect(result.stdout).toContain("repair");
  });
});

async function writeCheckPackage(dir: string): Promise<void> {
  const pkg = join(dir, ".ghost", "fingerprint");
  await mkdir(pkg, { recursive: true });
  await writeFile(join(pkg, "map.md"), mapWithScopes());
  await writeFile(join(pkg, "profile.md"), profile());
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

async function writeTailwindCheckPackage(dir: string): Promise<void> {
  const pkg = join(dir, ".ghost", "fingerprint");
  await mkdir(pkg, { recursive: true });
  await writeFile(join(pkg, "map.md"), webMapWithScopes());
  await writeFile(join(pkg, "profile.md"), profile());
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
    join(pkg, "checks.yml"),
    `schema: ghost.checks/v1
id: managerbot-ui
checks:
  - id: no-hardcoded-managerbot-ui-hex
    title: Use Managerbot semantic color tokens
    status: active
    severity: serious
    applies_to:
      scopes: [managerbot-ui-primitives]
      paths: [src/components]
    detector:
      type: forbidden-regex
      pattern: '#[0-9a-fA-F]{3,8}'
      contexts: [react]
    evidence:
      support: 0.9
      observed_count: 1
      examples:
        - src/components/button.tsx
    repair: Replace raw color values with Managerbot semantic color tokens.
`,
  );
}

async function writeComponentPatternCheckPackage(dir: string): Promise<void> {
  const pkg = join(dir, ".ghost", "fingerprint");
  await mkdir(pkg, { recursive: true });
  await writeFile(join(pkg, "map.md"), webMapWithScopes());
  await writeFile(join(pkg, "profile.md"), profile());
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
    join(pkg, "checks.yml"),
    `schema: ghost.checks/v1
id: managerbot-ui
checks:
  - id: use-managerbot-tool-footer-actions
    title: Use Managerbot tool footer action primitives
    status: active
    severity: serious
    applies_to:
      scopes: [managerbot-ui-primitives]
      paths: [src/components/tools]
    detector:
      type: forbidden-regex
      pattern: 'className="flex justify-end gap-2"'
      contexts: [react]
    evidence:
      support: 0.9
      observed_count: 2
      examples:
        - src/components/tools/square-update-preview/square-update-preview-ui.tsx
    repair: Replace hand-rolled approval footer layout with shared tool footer primitives.
    repair_hints:
      - kind: component-pattern-replacement
        replacement: ToolCardFooter + ToolFooterActions + ToolCancelButton + ToolSubmitButton
        reason: Found the same approval-card footer pattern in sibling tools.
        inferred_from: sibling-file-pattern
        source:
          path: src/components/tools/square-update-preview/square-update-preview-ui.tsx
          line: 425
        sources:
          - path: src/components/tools/square-update-preview/square-update-preview-ui.tsx
            line: 425
          - path: src/components/tools/square-remove-preview/square-remove-preview-ui.tsx
            line: 298
        confidence: high
`,
  );
}

async function writeButtonSource(dir: string, lines: string[]): Promise<void> {
  const componentDir = join(dir, "src", "components");
  await mkdir(componentDir, { recursive: true });
  await writeFile(join(componentDir, "button.tsx"), `${lines.join("\n")}\n`);
}

function profile(): string {
  return `---
id: cash-ios
source: llm
timestamp: 2026-05-06T00:00:00.000Z
palette:
  dominant: []
  neutrals: { steps: [], count: 0 }
  semantic: []
  saturationProfile: muted
  contrast: moderate
spacing: { scale: [], baseUnit: null, regularity: 0 }
typography:
  families: []
  sizeRamp: []
  weightDistribution: {}
  lineHeightPattern: normal
surfaces:
  borderRadii: []
  shadowComplexity: deliberate-none
  borderUsage: minimal
---

# Character

Restrained native Cash surfaces.

# Signature

Feature screens prefer token-backed controls.

# Decisions
`;
}

function lendingPatch(line: string): string {
  return `diff --git a/Code/Features/Lending/View.swift b/Code/Features/Lending/View.swift
--- a/Code/Features/Lending/View.swift
+++ b/Code/Features/Lending/View.swift
@@ -0,0 +1,1 @@
+${line}
`;
}

function buttonPatch(line: string): string {
  return `diff --git a/src/components/button.tsx b/src/components/button.tsx
--- a/src/components/button.tsx
+++ b/src/components/button.tsx
@@ -2,0 +3,1 @@
+${line}
`;
}

function componentPatternPatch(line: string): string {
  return `diff --git a/src/components/tools/demo-tool.tsx b/src/components/tools/demo-tool.tsx
--- a/src/components/tools/demo-tool.tsx
+++ b/src/components/tools/demo-tool.tsx
@@ -1,0 +2,1 @@
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

function webMapWithScopes(): string {
  return `---
schema: ghost.map/v2
id: managerbot-ui
repo: squareup/square-web
mapped_at: 2026-05-06T00:00:00.000Z
platform: web
languages:
  - { name: typescript, files: 5, share: 1.0 }
build_system: pnpm
package_manifests:
  - package.json
composition:
  frameworks:
    - { name: react }
  rendering: react
  styling:
    - tailwindcss
design_system:
  paths:
    - src/components
  status: active
surface_sources:
  render_strategy: static-source
  include:
    - src/components/**
  exclude:
    - "**/node_modules/**"
feature_areas:
  - name: managerbot-ui-primitives
    paths:
      - src/components
scopes:
  - id: managerbot-ui-primitives
    name: Managerbot UI primitives
    kind: design-system
    paths:
      - src/components
orientation_files:
  - README.md
---

## Identity

Managerbot UI fixture.

## Topology

Components live under src/components.

## Conventions

Use semantic Tailwind tokens.
`;
}
