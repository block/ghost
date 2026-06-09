import { mkdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { buildCli } from "../src/cli.js";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

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

  it("prints compact top-level help for new adopters", async () => {
    const result = await runCli(["--help"], dir, { allowNoExit: true });

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("ghost");
    expect(result.stdout).toContain("Core workflow");
    for (const command of [
      "init",
      "scan",
      "lint",
      "verify",
      "check",
      "review",
      "emit",
      "skill install",
    ]) {
      expect(result.stdout).toContain(command);
    }
    expect(result.stdout).toContain("ghost --help --all");
    expect(result.stdout).not.toContain("survey <op>");
    expect(result.stdout).not.toContain("diff <a> <b>");
    expect(result.stdout).not.toMatch(/\n {2}ack\s/);
    expect(result.stdout).not.toContain("track <fingerprint>");
    expect(result.stdout).not.toContain("diverge <dimension>");
    expect(result.stdout).not.toContain("proposal <op>");
  });

  it("prints the complete grouped command index with --help --all", async () => {
    const result = await runCli(["--help", "--all"], dir, {
      allowNoExit: true,
    });

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Core workflow");
    expect(result.stdout).toContain("Advanced/package inspection");
    expect(result.stdout).toContain("Compare/stance");
    expect(result.stdout).toContain("Maintenance/cache");
    for (const command of [
      "lint [file]",
      "init [dir]",
      "verify [dir]",
      "scan [dir]",
      "stack [paths...]",
      "inventory [path]",
      "describe [fingerprint]",
      "diff <a> <b>",
      "survey <op> [...surveys]",
      "emit <kind>",
      "compare [...fingerprints]",
      "ack",
      "track <fingerprint>",
      "diverge <dimension>",
      "skill <action>",
      "check",
      "review",
    ]) {
      expect(result.stdout).toContain(command);
    }
  });

  it("keeps command-specific --all help local to lint and verify", async () => {
    const lint = await runCli(["lint", "--help"], dir, { allowNoExit: true });
    const verify = await runCli(["verify", "--help"], dir, {
      allowNoExit: true,
    });

    expect(lint.code).toBe(0);
    expect(lint.stdout).toContain("--all");
    expect(lint.stdout).toContain("Validate every nested fingerprint package");
    expect(lint.stdout).not.toContain("Core workflow");
    expect(verify.code).toBe(0);
    expect(verify.stdout).toContain("--all");
    expect(verify.stdout).toContain("Verify every nested fingerprint package");
    expect(verify.stdout).not.toContain("Core workflow");
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

  it("initializes the default fingerprint package without cache", async () => {
    const init = await runCli(["init", "--format", "json"], dir);
    const scan = await runCli(["scan", "--format", "json"], dir);
    await writeFile(
      join(dir, "change.patch"),
      lendingPatch("let color = CashTheme.primary"),
    );

    expect(init.code).toBe(0);
    const initOutput = JSON.parse(init.stdout);
    expect(Object.keys(initOutput).sort()).toEqual([
      "checks",
      "composition",
      "dir",
      "fingerprintDir",
      "inventory",
      "manifest",
      "prose",
    ]);
    await expect(
      readFile(join(dir, ".ghost", "fingerprint", "manifest.yml"), "utf-8"),
    ).resolves.toContain("schema: ghost.fingerprint-package/v1");
    await expect(
      readFile(
        join(dir, ".ghost", "fingerprint", "enforcement", "checks.yml"),
        "utf-8",
      ),
    ).resolves.toContain("schema: ghost.checks/v1");
    const status = JSON.parse(scan.stdout);
    expect(status.cache.state).toBe("missing");

    const lint = await runCli(["lint"], dir);
    const verify = await runCli(["verify", ".ghost", "--root", "."], dir);
    const check = await runCli(["check", "--diff", "change.patch"], dir);
    const review = await runCli(["review", "--diff", "change.patch"], dir);
    const reviewCommand = await runCli(["emit", "review-command"], dir);
    const contextBundle = await runCli(["emit", "context-bundle"], dir);

    expect(lint.code).toBe(0);
    expect(verify.code).toBe(0);
    expect(check.code).toBe(0);
    expect(review.code).toBe(0);
    expect(review.stdout).toContain("schema: ghost.fingerprint/v1");
    expect(reviewCommand.code).toBe(0);
    expect(contextBundle.code).toBe(0);
  });

  it("warns for checks grounded in omitted sparse fingerprint refs", async () => {
    await runCli(["init"], dir);
    await writeFile(
      join(dir, ".ghost", "fingerprint", "enforcement", "checks.yml"),
      `schema: ghost.checks/v1
id: local
checks:
  - id: missing-memory-check
    title: Missing memory check
    status: active
    severity: serious
    derivation:
      prose: [prose.principle:not-recorded]
    applies_to:
      paths: [Code/Features/Lending]
    detector:
      type: forbidden-regex
      pattern: '#[0-9a-fA-F]{3,8}'
    evidence:
      support: 0.94
      observed_count: 47
      examples:
        - Code/Features/Lending/LendingUI
`,
    );

    const lint = await runCli(["lint", ".ghost", "--format", "json"], dir);

    expect(lint.code).toBe(0);
    const report = JSON.parse(lint.stdout);
    expect(report.issues[0]).toMatchObject({
      severity: "warning",
      rule: "check-grounding-unknown",
      path: "fingerprint/enforcement/checks.yml.checks[0].derivation.prose[0]",
    });
  });

  it("validates standalone checks.yml derivation refs with a valid sibling fingerprint", async () => {
    await writeCheckPackage(dir, { checks: false });
    await writeFile(
      join(dir, ".ghost", "fingerprint", "enforcement", "checks.yml"),
      checksFileWithDerivation("prose.principle:not-recorded"),
    );

    const lint = await runCli(
      ["lint", ".ghost/fingerprint/enforcement/checks.yml", "--format", "json"],
      dir,
    );

    expect(lint.code).toBe(0);
    const report = JSON.parse(lint.stdout);
    expect(report.issues[0]).toMatchObject({
      severity: "warning",
      rule: "check-grounding-unknown",
      path: "checks[0].derivation.prose[0]",
    });
    expect(report.issues).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rule: "check-grounding-unverified" }),
      ]),
    );
  });

  it("marks standalone checks.yml grounding unverified when no sibling fingerprint exists", async () => {
    await writeFile(
      join(dir, "checks.yml"),
      checksFileWithDerivation("prose.principle:tokenized-ui-color"),
    );

    const lint = await runCli(["lint", "checks.yml", "--format", "json"], dir);

    expect(lint.code).toBe(0);
    const report = JSON.parse(lint.stdout);
    expect(report.info).toBe(1);
    expect(report.issues[0]).toMatchObject({
      severity: "info",
      rule: "check-grounding-unverified",
      path: "checks[0].derivation",
    });
  });

  it("keeps standalone checks.yml lint non-blocking when the sibling fingerprint is invalid", async () => {
    await mkdir(join(dir, ".ghost", "fingerprint", "enforcement"), {
      recursive: true,
    });
    await writeFile(
      join(dir, ".ghost", "fingerprint", "manifest.yml"),
      "not: draft\n",
    );
    await writeFile(
      join(dir, ".ghost", "fingerprint", "enforcement", "checks.yml"),
      checksFileWithDerivation("prose.principle:tokenized-ui-color"),
    );

    const lint = await runCli(
      ["lint", ".ghost/fingerprint/enforcement/checks.yml", "--format", "json"],
      dir,
    );

    expect(lint.code).toBe(0);
    const report = JSON.parse(lint.stdout);
    expect(report.issues[0]).toMatchObject({
      severity: "info",
      rule: "check-grounding-unverified",
      path: "checks[0].derivation",
    });
  });

  it("initializes a bundle and reports fingerprint capture state as json", async () => {
    const init = await runCli(["init", "--with-intent"], dir);
    const scan = await runCli(["scan", "--format", "json"], dir);
    const scanHuman = await runCli(["scan"], dir);

    expect(init.code).toBe(0);
    expect(init.stdout).toContain("manifest.yml:");
    expect(init.stdout).toContain("prose.yml:");
    expect(init.stdout).toContain("inventory.yml:");
    expect(init.stdout).toContain("composition.yml:");
    expect(init.stdout).toContain("checks.yml:");
    expect(init.stdout).not.toContain("cache/:");
    expect(
      await readFile(
        join(dir, ".ghost", "fingerprint", "manifest.yml"),
        "utf-8",
      ),
    ).toContain("schema: ghost.fingerprint-package/v1");
    expect(
      await readFile(
        join(dir, ".ghost", "fingerprint", "memory", "intent.md"),
        "utf-8",
      ),
    ).toContain("# Intent");
    expect(scan.code).toBe(0);
    const status = JSON.parse(scan.stdout);
    expect(status.fingerprint.state).toBe("present");
    expect(status.proposals).toBeUndefined();
    expect(status.cache.state).toBe("missing");
    expect(status.readiness.state).toBe("fingerprint-empty");
    expect(status.readiness.layer_counts).toEqual({
      prose: 0,
      inventory: 0,
      composition: 0,
    });
    expect(status.readiness.missing_layers).toEqual([
      "prose",
      "inventory",
      "composition",
    ]);
    expect(scanHuman.stdout).toContain("fingerprint dir:");
    expect(scanHuman.stdout).toContain("readiness: fingerprint-empty");
    expect(scanHuman.stdout).toContain(
      "layers: prose 0, inventory 0, composition 0",
    );
    expect(scanHuman.stdout).toContain(
      "missing layers: prose, inventory, composition",
    );
    expect(scanHuman.stdout).not.toContain("memory dir:");
  });

  it("initializes a blank product scaffold with config and reference library wiring", async () => {
    const init = await runCli(
      [
        "init",
        "--with-config",
        "--reference",
        "packages/ghost-ui/.ghost",
        "--format",
        "json",
      ],
      dir,
    );
    const scan = await runCli(["scan", "--format", "json"], dir);
    const inventory = await runCli(["inventory"], dir);
    await mkdir(join(dir, "packages", "ghost-ui", ".ghost"), {
      recursive: true,
    });
    await mkdir(join(dir, "packages", "ghost-ui", ".ghost", "fingerprint"), {
      recursive: true,
    });
    await mkdir(join(dir, "packages", "ghost-ui", "public", "r"), {
      recursive: true,
    });
    await writeFile(
      join(
        dir,
        "packages",
        "ghost-ui",
        ".ghost",
        "fingerprint",
        "manifest.yml",
      ),
      "schema: ghost.fingerprint-package/v1\nid: ghost-ui\n",
    );
    await writeFile(
      join(dir, "packages", "ghost-ui", "public", "r", "registry.json"),
      "{}\n",
    );
    const verify = await runCli(["verify", ".ghost", "--root", "."], dir);

    expect(init.code).toBe(0);
    const initOutput = JSON.parse(init.stdout);
    expect(initOutput.cache).toBeUndefined();
    expect(await realpath(initOutput.config)).toBe(
      await realpath(join(dir, ".ghost", "config.yml")),
    );

    const fingerprint = parseYaml(
      await readFile(
        join(dir, ".ghost", "fingerprint", "inventory.yml"),
        "utf-8",
      ),
    ) as Record<string, unknown>;
    expect(fingerprint).not.toHaveProperty("implementation_vocabulary");
    expect(fingerprint).not.toHaveProperty("patterns");
    expect(fingerprint).toMatchObject({
      building_blocks: {
        libraries: ["ghost-ui"],
      },
      sources: [
        {
          id: "ghost-ui",
          kind: "registry",
          ref: "registry:packages/ghost-ui/public/r/registry.json",
        },
      ],
    });

    const config = parseYaml(
      await readFile(join(dir, ".ghost", "config.yml"), "utf-8"),
    ) as Record<string, unknown>;
    expect(config).toMatchObject({
      schema: "ghost.config/v1",
      targets: [{ id: "product", platform: "web", roots: [] }],
      libraries: [
        {
          id: "ghost-ui",
          role: "primary-ui-registry",
          source: "registry:packages/ghost-ui/public/r/registry.json",
          fingerprint: "packages/ghost-ui/.ghost/fingerprint/manifest.yml",
        },
      ],
    });

    const status = JSON.parse(scan.stdout);
    expect(status.config.state).toBe("present");
    expect(status.readiness.state).toBe("inventory-only");
    expect(status.readiness.missing_layers).toEqual(["prose", "composition"]);

    const inventoryOutput = JSON.parse(inventory.stdout);
    expect(inventoryOutput.config.libraries[0].id).toBe("ghost-ui");
    expect(verify.code).toBe(0);
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

  it("lints, verifies, and scans the Ghost UI reference bundle", async () => {
    const lint = await runCli(["lint", "packages/ghost-ui/.ghost"], REPO_ROOT);
    const verify = await runCli(
      ["verify", "packages/ghost-ui/.ghost", "--root", "packages/ghost-ui"],
      REPO_ROOT,
    );
    const scan = await runCli(
      ["scan", "packages/ghost-ui/.ghost", "--format", "json"],
      REPO_ROOT,
    );

    expect(lint.code).toBe(0);
    expect(verify.code).toBe(0);
    expect(scan.code).toBe(0);
    const status = JSON.parse(scan.stdout);
    expect(status.fingerprint.state).toBe("present");
    expect(status.checks.state).toBe("present");
    expect(status.proposals).toBeUndefined();
    expect(status.cache.state).toBe("present");
    expect(status.readiness.state).toBe("fingerprint-partial");
    expect(status.readiness.missing_layers).toEqual(["composition"]);
    expect(status.readiness.reasons[0]).toContain(
      "prose and inventory but is missing composition",
    );
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

  it("keeps derived patterns implementation-aware when no UI surfaces exist", async () => {
    await mkdir(join(dir, ".ghost"), { recursive: true });
    await writeFile(
      join(dir, ".ghost", "survey.json"),
      JSON.stringify({
        schema: "ghost.survey/v1",
        sources: [
          { id: "library", target: ".", scanned_at: "2026-05-19T00:00:00Z" },
        ],
        values: [],
        tokens: [],
        components: [
          {
            id: "component_button",
            source: { target: ".", scanned_at: "2026-05-19T00:00:00Z" },
            name: "Button",
            discovered_via: "registry.json",
          },
        ],
        ui_surfaces: [],
      }),
    );

    const result = await runCli(
      ["survey", "patterns", ".ghost/survey.json", "--format", "json"],
      dir,
    );

    expect(result.code).toBe(0);
    const patterns = JSON.parse(result.stdout);
    expect(patterns.composition_patterns).toHaveLength(0);
    expect(patterns.advisory.review_expectations[0]).toContain(
      "No UI surface evidence",
    );
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
    expect(fixed.schema).toBe("ghost.survey/v1");
    expect(fixed.values[0].id).toBeTruthy();
  });

  it("emits review commands and context bundles from the unified cli", async () => {
    await writeCheckPackage(dir);
    await mkdir(join(dir, ".ghost", "fingerprint", "sources", "cache"), {
      recursive: true,
    });
    await writeFile(
      join(dir, ".ghost", "fingerprint", "sources", "cache", "inventory.json"),
      JSON.stringify(
        {
          root: dir,
          platform_hints: ["ios"],
          build_system_hints: ["spm"],
          language_histogram: [{ name: "swift", files: 12 }],
          package_manifests: ["Package.swift"],
          candidate_config_files: ["Code/Theme.swift"],
          registry_files: [],
          top_level_tree: [{ path: "Code/", kind: "dir", child_count: 3 }],
        },
        null,
        2,
      ),
    );
    await writeFile(
      join(dir, ".ghost", "fingerprint.md"),
      fingerprintWithId("local"),
    );

    const reviewCommand = await runCli(["emit", "review-command"], dir);
    const contextBundle = await runCli(["emit", "context-bundle"], dir);

    expect(reviewCommand.code).toBe(0);
    expect(reviewCommand.stdout).toContain("design-review.md");
    const emittedReviewCommand = await readFile(
      join(dir, ".claude", "commands", "design-review.md"),
      "utf-8",
    );
    expect(emittedReviewCommand).toContain(
      ".ghost/fingerprint/prose.yml`, `.ghost/fingerprint/inventory.yml`, and `.ghost/fingerprint/composition.yml",
    );
    expect(emittedReviewCommand).toContain("Exemplars");
    expect(emittedReviewCommand).toContain("lending-tokenized-screen");
    expect(emittedReviewCommand).toContain("provisional and non-Ghost-backed");
    expect(emittedReviewCommand).not.toContain("Proposal Threshold");
    expect(emittedReviewCommand).not.toContain("recommend-proposal");
    expect(emittedReviewCommand).toContain("experience-gap");
    expect(emittedReviewCommand).toContain("no-hardcoded-ui-color");
    expect(emittedReviewCommand).not.toContain(
      "deprecated legacy direct-markdown",
    );
    expect(contextBundle.code).toBe(0);
    expect(contextBundle.stdout).toContain("prompt.md");
    expect(contextBundle.stdout).toContain("fingerprint/prose.yml");
    expect(contextBundle.stdout).toContain("fingerprint/inventory.yml");
    expect(contextBundle.stdout).toContain("fingerprint/composition.yml");
    expect(contextBundle.stdout).not.toContain("fingerprint.yml");
    expect(contextBundle.stdout).not.toContain("survey-summary.md");
    await expect(
      readFile(
        join(dir, "ghost-context", "fingerprint", "manifest.yml"),
        "utf-8",
      ),
    ).resolves.toContain("schema: ghost.fingerprint-package/v1");
    await expect(
      readFile(join(dir, "ghost-context", "fingerprint", "prose.yml"), "utf-8"),
    ).resolves.toContain("summary:");
    await expect(
      readFile(join(dir, "ghost-context", "fingerprint.yml"), "utf-8"),
    ).rejects.toThrow();
    const prompt = await readFile(
      join(dir, "ghost-context", "prompt.md"),
      "utf-8",
    );
    expect(prompt).toContain("# Prose");
    expect(prompt).toContain("Agent Handoff");
    expect(prompt).toContain("upstream handoff before generating");
    expect(prompt).toContain("# Inventory");
    expect(prompt.indexOf("## Topology")).toBeLessThan(
      prompt.indexOf("## Building Blocks"),
    );
    expect(prompt.indexOf("## Building Blocks")).toBeLessThan(
      prompt.indexOf("## Exemplars"),
    );
    expect(prompt.indexOf("## Exemplars")).toBeLessThan(
      prompt.indexOf("## Generated Cache"),
    );
    expect(prompt).toContain("Generated cache is optional source material");
    expect(prompt).toContain("Package.swift");
    expect(prompt).toContain("# Composition");
    expect(prompt).toContain("no-hardcoded-ui-color");
    expect(prompt).not.toContain("candidate-density-check");
    expect(prompt).not.toContain("status: proposed");
    expect(prompt).not.toContain("Proposal Threshold");
    expect(prompt).toContain("Label silent-layer reasoning as provisional");
    await expect(
      readFile(join(dir, "ghost-context", "SKILL.md"), "utf-8"),
    ).resolves.toContain("provisional and\nnon-Ghost-backed");
    await expect(
      readFile(join(dir, "ghost-context", "SKILL.md"), "utf-8"),
    ).resolves.toContain("upstream handoff for agentic UI work");
  });

  it("emits context bundles when generated cache is malformed", async () => {
    await writeCheckPackage(dir);
    await mkdir(join(dir, ".ghost", "fingerprint", "sources", "cache"), {
      recursive: true,
    });
    await writeFile(
      join(dir, ".ghost", "fingerprint", "sources", "cache", "inventory.json"),
      "{nope",
    );

    const contextBundle = await runCli(["emit", "context-bundle"], dir);

    expect(contextBundle.code).toBe(0);
    await expect(
      readFile(join(dir, "ghost-context", "prompt.md"), "utf-8"),
    ).resolves.toContain("could not be read");
  });

  it("warns when fingerprint exemplar paths are unreachable", async () => {
    await writeCheckPackage(dir);

    const verify = await runCli(
      ["verify", ".ghost", "--root", ".", "--format", "json"],
      dir,
    );

    expect(verify.code).toBe(0);
    const report = JSON.parse(verify.stdout);
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rule: "fingerprint-exemplar-unreachable",
          path: "fingerprint/inventory.yml.exemplars[0].path",
        }),
      ]),
    );
  });

  it("rejects removed legacy direct markdown emit flags", () => {
    const cli = buildCli();

    expect(() =>
      cli.parse([
        "node",
        "ghost",
        "emit",
        "review-command",
        "--fingerprint",
        "legacy.fingerprint.md",
        "--stdout",
      ]),
    ).toThrow("Unknown option `--fingerprint`");
    expect(() =>
      cli.parse(["node", "ghost", "emit", "context-bundle", "--no-tokens"]),
    ).toThrow("Unknown option `--tokens`");
  });
  it("installs the unified ghost skill bundle", async () => {
    const result = await runCli(
      ["skill", "install", "--dest", "skills/ghost"],
      dir,
    );

    expect(result.code).toBe(0);
    for (const path of [
      "SKILL.md",
      "references/capture.md",
      "references/review.md",
      "references/remediate.md",
      "references/brief.md",
    ]) {
      await expect(
        readFile(join(dir, "skills", "ghost", path), "utf-8"),
      ).resolves.toBeTruthy();
    }
    await expect(
      readFile(join(dir, "skills", "ghost", "SKILL.md"), "utf-8"),
    ).resolves.toContain("When Fingerprint Layers Are Silent");
    await expect(
      readFile(join(dir, "skills", "ghost", "SKILL.md"), "utf-8"),
    ).resolves.toContain(
      "Never claim provisional reasoning, local convention, or general UX reasoning",
    );
    await expect(
      readFile(
        join(dir, "skills", "ghost", "references", "review.md"),
        "utf-8",
      ),
    ).resolves.toContain("fingerprint layers are silent");
    await expect(
      readFile(
        join(dir, "skills", "ghost", "references", "propose.md"),
        "utf-8",
      ),
    ).rejects.toThrow();
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

    expect(result.code, result.stderr).toBe(1);
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
    expect(result.stdout).toContain(
      "fingerprint/prose.yml, fingerprint/inventory.yml, fingerprint/composition.yml",
    );
    expect(result.stdout).toContain("active check when blocking");
    expect(result.stdout).not.toContain("Proposal Threshold");
    expect(result.stdout).toContain("provisional and non-Ghost-backed");
    expect(result.stdout).not.toContain("recommend-proposal");
    expect(result.stdout).toContain("missing-memory");
    expect(result.stdout).toContain("experience-gap");
    expect(result.stdout).toContain("repair or intentional-divergence");
  });

  it("review includes config reference registries when config.yml is present", async () => {
    await writeCheckPackage(dir);
    await writeFile(
      join(dir, ".ghost", "config.yml"),
      `schema: ghost.config/v1
targets:
  - id: product
    platform: web
    roots: []
libraries:
  - id: ghost-ui
    role: primary-ui-registry
    source: registry:packages/ghost-ui/public/r/registry.json
    fingerprint: packages/ghost-ui/.ghost/fingerprint/manifest.yml
`,
    );
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
    expect(packet.config.libraries[0]).toMatchObject({
      id: "ghost-ui",
      role: "primary-ui-registry",
    });
  });

  it("review omits accepted decisions by default", async () => {
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
    expect(packet.fingerprint.schema).toBe("ghost.fingerprint/v1");
    expect(packet.finding_categories).toContain("experience-gap");
    expect(packet.proposal_types).toBeUndefined();
    expect(packet.open_proposals).toBeUndefined();
    expect(packet.accepted_decisions).toBeUndefined();
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
    expect(packet.accepted_decisions).toHaveLength(1);
    expect(packet.accepted_decisions[0].id).toBe("checkout-reversibility");
    expect(packet.memory).toBeUndefined();
    expect(JSON.stringify(packet.accepted_decisions)).not.toContain(
      "rejected-decision",
    );
    expect(JSON.stringify(packet.accepted_decisions)).not.toContain(
      "saved-payment-empty-state",
    );
  });

  it("review --package includes only accepted decisions when requested", async () => {
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
        "--package",
        ".ghost",
        "--include-memory",
        "--format",
        "json",
      ],
      dir,
    );

    expect(result.code).toBe(0);
    const packet = JSON.parse(result.stdout);
    expect(packet.accepted_decisions).toHaveLength(1);
    expect(packet.accepted_decisions[0].id).toBe("checkout-reversibility");
    expect(JSON.stringify(packet.accepted_decisions)).not.toContain(
      "rejected-decision",
    );
    expect(JSON.stringify(packet.accepted_decisions)).not.toContain(
      "saved-payment-empty-state",
    );
  });

  it("review --package points empty decision memory to the canonical path", async () => {
    await writeCheckPackage(dir);
    await writeFile(
      join(dir, "change.patch"),
      lendingPatch("let color = CashTheme.primary"),
    );

    const result = await runCli(
      [
        "review",
        "--diff",
        "change.patch",
        "--package",
        ".ghost",
        "--include-memory",
      ],
      dir,
    );

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("fingerprint/memory/decisions");
    expect(result.stdout).not.toContain(".ghost/decisions");
  });

  it("check routes changed files through nested stacks by default", async () => {
    await writeNestedCheckPackage(dir);
    await writeFile(
      join(dir, "change.patch"),
      webPatch("apps/checkout/review/page.tsx", 'const color = "#ffffff";'),
    );

    const result = await runCli(
      ["check", "--diff", "change.patch", "--format", "json"],
      dir,
    );

    expect(result.code).toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report.schema).toBe("ghost.check-report/v1");
    expect(report.result).toBe("pass");
    expect(report.fingerprint_dir).toBe(".ghost");
    expect(report.memory_dir).toBeUndefined();
    expect(report.stacks[0].memory_dir).toBeUndefined();
    expect(report.stacks[0].layer_dirs).toHaveLength(2);
    expect(report.routed_files[0]).toMatchObject({
      path: "apps/checkout/review/page.tsx",
      checks: [],
    });
  });

  it("--package keeps check in exact single-bundle mode", async () => {
    await writeNestedCheckPackage(dir);
    await writeFile(
      join(dir, "change.patch"),
      webPatch("apps/checkout/review/page.tsx", 'const color = "#ffffff";'),
    );

    const result = await runCli(
      [
        "check",
        "--diff",
        "change.patch",
        "--package",
        ".ghost",
        "--format",
        "json",
      ],
      dir,
    );

    expect(result.code).toBe(1);
    const report = JSON.parse(result.stdout);
    expect(report.schema).toBe("ghost.check-report/v1");
    expect(report.findings[0].check_id).toBe("no-hardcoded-color");
    expect(report.findings[0]).toMatchObject({
      path: "apps/checkout/review/page.tsx",
      line: 1,
      title: "No hardcoded colors",
      severity: "serious",
      detector: "forbidden-regex",
      message: "Added UI code matched a forbidden pattern.",
      match: "#ffffff",
    });
    expect(report.stacks).toBeUndefined();
  });

  it("resolves stack checks from a custom fingerprint directory", async () => {
    await writeNestedCheckPackage(dir, ".design/memory");
    await writeFile(
      join(dir, "change.patch"),
      webPatch("apps/checkout/review/page.tsx", 'const color = "#ffffff";'),
    );

    const result = await runCli(
      [
        "check",
        "--diff",
        "change.patch",
        "--memory-dir",
        ".design/memory",
        "--format",
        "json",
      ],
      dir,
    );

    expect(result.code).toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report.fingerprint_dir).toBe(".design/memory");
    expect(report.memory_dir).toBeUndefined();
    expect(report.stacks[0]).toMatchObject({
      fingerprint_dir: ".design/memory",
      changed_files: ["apps/checkout/review/page.tsx"],
    });
    expect(report.stacks[0].memory_dir).toBeUndefined();
    expect(report.stacks[0].layer_dirs).toEqual([
      await realpath(join(dir, ".design", "memory")),
      await realpath(join(dir, "apps", "checkout", ".design", "memory")),
    ]);
  });

  it("review emits stack packets for mixed diffs", async () => {
    await writeNestedCheckPackage(dir);
    await writeFile(
      join(dir, "change.patch"),
      [
        webPatch("apps/checkout/review/page.tsx", "const x = CheckoutTheme;"),
        webPatch("shared/home.tsx", "const x = RootTheme;"),
      ].join("\n"),
    );

    const result = await runCli(
      ["review", "--diff", "change.patch", "--format", "json"],
      dir,
    );

    expect(result.code).toBe(0);
    const packet = JSON.parse(result.stdout);
    expect(packet.stacks).toHaveLength(2);
    expect(packet.stacks[0].fingerprint_dir).toBe(".ghost");
    expect(packet.stacks[0].memory_dir).toBeUndefined();
    expect(packet.stacks[0].merged.fingerprint.prose.summary.product).toBe(
      "Checkout",
    );
    expect(packet.stacks[0].layer_dirs).toHaveLength(2);
    expect(packet.stacks[1].layer_dirs).toHaveLength(1);
  });

  it("stack inspects resolved nested layers", async () => {
    await writeNestedCheckPackage(dir);

    const result = await runCli(
      ["stack", "apps/checkout/review/page.tsx", "--format", "json"],
      dir,
    );

    expect(result.code).toBe(0);
    const stacks = JSON.parse(result.stdout);
    expect(stacks[0].layers).toHaveLength(2);
    expect(stacks[0].fingerprint_dir).toBe(".ghost");
    expect(stacks[0].memory_dir).toBeUndefined();
    expect(stacks[0].layers[0].memory_dir).toBeUndefined();
    expect(stacks[0].merged.fingerprint.prose.summary.product).toBe("Checkout");
  });

  it("rejects unsafe memory directory overrides", async () => {
    const result = await runCli(
      ["stack", ".", "--memory-dir", "../outside"],
      dir,
    );

    expect(result.code).toBe(2);
    expect(result.stderr).toContain("--memory-dir must not contain");
  });

  it("emit review-command resolves merged fingerprint stack for --path", async () => {
    await writeNestedCheckPackage(dir);

    const result = await runCli(
      [
        "emit",
        "review-command",
        "--path",
        "apps/checkout/review/page.tsx",
        "--stdout",
      ],
      dir,
    );

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("RootTheme");
    expect(result.stdout).toContain("Checkout");
    expect(result.stdout).toContain("CheckoutTheme");
  });

  it("init --scope creates a nested .ghost bundle", async () => {
    const result = await runCli(
      ["init", "--scope", "apps/checkout", "--format", "json"],
      dir,
    );

    expect(result.code).toBe(0);
    const out = JSON.parse(result.stdout);
    expect(await realpath(out.dir)).toBe(
      await realpath(join(dir, "apps", "checkout", ".ghost")),
    );
    const manifest = await readFile(
      join(dir, "apps", "checkout", ".ghost", "fingerprint", "manifest.yml"),
      "utf-8",
    );
    expect(manifest).toContain("ghost.fingerprint-package/v1");
    const prose = await readFile(
      join(dir, "apps", "checkout", ".ghost", "fingerprint", "prose.yml"),
      "utf-8",
    );
    expect(prose).not.toContain("review_policy");
    expect(prose).not.toContain("proposal");
  });

  it("init --scope creates a nested package under a custom fingerprint directory", async () => {
    const result = await runCli(
      [
        "init",
        "--scope",
        "apps/checkout",
        "--memory-dir",
        ".design/memory",
        "--format",
        "json",
      ],
      dir,
    );

    expect(result.code).toBe(0);
    const out = JSON.parse(result.stdout);
    expect(await realpath(out.dir)).toBe(
      await realpath(join(dir, "apps", "checkout", ".design", "memory")),
    );
    expect(
      await readFile(
        join(
          dir,
          "apps",
          "checkout",
          ".design",
          "memory",
          "fingerprint",
          "manifest.yml",
        ),
        "utf-8",
      ),
    ).toContain("ghost.fingerprint-package/v1");
  });

  it("lint --all and verify --all include nested bundles", async () => {
    await writeNestedCheckPackage(dir);

    const lint = await runCli(["lint", "--all", "--format", "json"], dir);
    const verify = await runCli(["verify", "--all", "--format", "json"], dir);
    const scan = await runCli(
      ["scan", "--include-nested", "--format", "json"],
      dir,
    );

    expect(lint.code).toBe(0);
    expect(verify.code).toBe(0);
    expect(JSON.parse(scan.stdout).nested_bundles).toHaveLength(2);
  });

  it("lint, verify, and scan discover nested custom fingerprint directories", async () => {
    await writeNestedCheckPackage(dir, ".design/memory");

    const lint = await runCli(
      ["lint", "--all", "--memory-dir", ".design/memory", "--format", "json"],
      dir,
    );
    const verify = await runCli(
      ["verify", "--all", "--memory-dir", ".design/memory", "--format", "json"],
      dir,
    );
    const scan = await runCli(
      [
        "scan",
        "--include-nested",
        "--memory-dir",
        ".design/memory",
        "--format",
        "json",
      ],
      dir,
    );

    expect(lint.code).toBe(0);
    expect(verify.code).toBe(0);
    expect(JSON.parse(scan.stdout).nested_bundles).toHaveLength(2);
  });
});

async function writeCheckPackage(
  dir: string,
  options: { checks?: boolean } = {},
): Promise<void> {
  const pkg = join(dir, ".ghost");
  await mkdir(pkg, { recursive: true });
  await writeSplitFingerprintPackage(
    pkg,
    `schema: ghost.fingerprint/v1
prose:
  summary:
    product: Cash iOS
  situations: []
  principles:
    - id: tokenized-ui-color
      principle: UI colors should come from the product token system.
      check_refs: [check:no-hardcoded-ui-color]
  experience_contracts: []
inventory:
  topology:
    scopes:
      - id: lending
        paths: [Code/Features/Lending]
        surface_types: [native-feature]
    surface_types: [native-feature]
  exemplars:
    - id: lending-tokenized-screen
      path: Code/Features/Lending/LendingUI
      title: Lending tokenized UI
      surface_type: native-feature
      scope: lending
      why: Shows semantic CashTheme color usage for native lending UI.
      refs:
        - prose.principle:tokenized-ui-color
        - composition.pattern:tokenized-ui-color
  building_blocks:
    tokens: [CashTheme.primary]
    components: []
composition:
  patterns:
    - id: tokenized-ui-color
      kind: visual
      pattern: Product UI color uses semantic tokens instead of literals.
      check_refs: [check:no-hardcoded-ui-color]
`,
    options.checks === false
      ? undefined
      : `schema: ghost.checks/v1
id: cash-ios
checks:
  - id: no-hardcoded-ui-color
    title: Use design tokens for UI color
    status: active
    severity: serious
    derivation:
      prose: [prose.principle:tokenized-ui-color]
      composition: [composition.pattern:tokenized-ui-color]
      inventory: [inventory.exemplar:lending-tokenized-screen]
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
  - id: candidate-density-check
    title: Candidate density check
    status: proposed
    severity: nit
    derivation:
      prose: [prose.principle:tokenized-ui-color]
    applies_to:
      scopes: [lending]
      paths: [Code/Features/Lending]
    detector:
      type: required-regex
      pattern: 'CashTheme'
    evidence:
      support: 0.5
      observed_count: 1
      examples:
        - Code/Features/Lending/LendingUI
`,
  );
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
      schema: "ghost.survey/v1",
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
}

async function writeSplitFingerprintPackage(
  pkg: string,
  fingerprintRaw: string,
  checksRaw?: string,
): Promise<void> {
  const fingerprintDir = join(pkg, "fingerprint");
  const doc = parseYaml(fingerprintRaw) as Record<string, unknown>;
  await mkdir(join(fingerprintDir, "enforcement"), { recursive: true });
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
      ? [
          writeFile(
            join(fingerprintDir, "enforcement", "checks.yml"),
            checksRaw,
          ),
        ]
      : []),
  ]);
}

function checksFileWithDerivation(proseRef: string): string {
  return `schema: ghost.checks/v1
id: local
checks:
  - id: no-hardcoded-ui-color
    title: Use design tokens for UI color
    status: active
    severity: serious
    derivation:
      prose: [${proseRef}]
    applies_to:
      paths: [Code/Features/Lending]
    detector:
      type: forbidden-regex
      pattern: '#[0-9a-fA-F]{3,8}'
      contexts: [swift]
    evidence:
      support: 0.94
      observed_count: 47
      examples:
        - Code/Features/Lending/LendingUI
`;
}

async function writeMemoryFiles(dir: string): Promise<void> {
  const pkg = join(dir, ".ghost", "fingerprint", "memory");
  await mkdir(join(pkg, "decisions"), { recursive: true });
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
rationale: Rejected decisions are non-canonical rationale.
evidence:
  - note: Rejected in design review.
decided_at: "2026-05-17T00:00:00.000Z"
`,
  );
}

async function writeNestedCheckPackage(
  dir: string,
  memoryDir = ".ghost",
): Promise<void> {
  const rootMemory = memoryPackagePath(dir, memoryDir);
  const checkoutMemory = memoryPackagePath(
    join(dir, "apps", "checkout"),
    memoryDir,
  );
  await mkdir(join(rootMemory, "fingerprint", "sources", "cache"), {
    recursive: true,
  });
  await mkdir(join(checkoutMemory, "fingerprint", "sources", "cache"), {
    recursive: true,
  });
  await mkdir(join(dir, "apps", "checkout", "review"), { recursive: true });
  await mkdir(join(dir, "shared"), { recursive: true });
  await writeFile(join(dir, "apps", "checkout", "review", "page.tsx"), "");
  await writeFile(join(dir, "shared", "home.tsx"), "");

  await writeSplitFingerprintPackage(
    rootMemory,
    `schema: ghost.fingerprint/v1
prose:
  summary:
    product: Root Product
  situations: []
  principles: []
  experience_contracts: []
inventory:
  topology:
    scopes:
      - id: app
        paths: [apps, shared]
    surface_types: [web-app]
  building_blocks:
    tokens: [RootTheme]
composition:
  patterns:
    - id: root-token-pattern
      kind: visual
      pattern: Web UI color uses semantic product tokens.
`,
    `schema: ghost.checks/v1
id: root
checks:
  - id: no-hardcoded-color
    title: No hardcoded colors
    status: active
    severity: serious
    derivation:
      composition: [composition.pattern:root-token-pattern]
    applies_to:
      paths: [apps, shared]
    detector:
      type: forbidden-regex
      pattern: '#[0-9a-fA-F]{3,8}'
      contexts: [react]
    evidence:
      support: 0.93
      observed_count: 8
      examples:
        - shared/home.tsx
`,
  );

  await writeSplitFingerprintPackage(
    checkoutMemory,
    `schema: ghost.fingerprint/v1
prose:
  summary:
    product: Checkout
  situations: []
  principles: []
  experience_contracts: []
inventory:
  topology:
    scopes:
      - id: checkout
        paths: [review]
        surface_types: [payment-review]
    surface_types: [payment-review]
  building_blocks:
    tokens: [CheckoutTheme]
composition:
  patterns:
    - id: checkout-token-pattern
      kind: visual
      pattern: Checkout review uses checkout product tokens.
      applies_to:
        paths: [review]
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
      contexts: [react]
`,
  );
}

function memoryPackagePath(root: string, memoryDir: string): string {
  return join(root, ...memoryDir.split("/"));
}

function webPatch(path: string, added: string): string {
  return `diff --git a/${path} b/${path}
index 1111111..2222222 100644
--- a/${path}
+++ b/${path}
@@ -0,0 +1 @@
+${added}
`;
}

async function writeComparableBundle(
  pkg: string,
  patternId: string,
): Promise<void> {
  await mkdir(pkg, { recursive: true });
  await writeSplitFingerprintPackage(
    pkg,
    `schema: ghost.fingerprint/v1
prose:
  summary:
    product: ${patternId}
inventory:
  topology:
    surface_types: [settings]
  building_blocks:
    tokens: [${patternId}-token]
composition:
  patterns:
    - id: ${patternId}
      kind: layout
      pattern: ${patternId} uses a settings-oriented layout.
`,
  );
  await writeFile(
    join(pkg, "survey.json"),
    JSON.stringify({
      schema: "ghost.survey/v1",
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
schema: ghost.map/v1
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
