import { mkdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parse as parseYaml } from "yaml";
import { buildCli } from "../src/cli.js";

async function runCli(
  argv: string[],
  cwd: string,
  options: {
    allowNoExit?: boolean;
    env?: Record<string, string | undefined>;
    stdin?: string;
  } = {},
) {
  const cli = buildCli();
  const previousCwd = process.cwd();
  const previousEnv = new Map<string, string | undefined>();
  let stdout = "";
  let stderr = "";
  let exitCode: number | undefined;
  let finish: () => void = () => {};
  const done = new Promise<void>((resolve) => {
    finish = resolve;
  });

  const stdoutSpy = vi
    .spyOn(process.stdout, "write")
    .mockImplementation((chunk: string | Uint8Array, callback?: unknown) => {
      stdout += chunk.toString();
      if (typeof callback === "function") callback();
      return true;
    });
  const stderrSpy = vi
    .spyOn(process.stderr, "write")
    .mockImplementation((chunk: string | Uint8Array, callback?: unknown) => {
      stderr += chunk.toString();
      if (typeof callback === "function") callback();
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
  const stdinDescriptor = Object.getOwnPropertyDescriptor(process, "stdin");

  try {
    process.chdir(cwd);
    if (options.stdin !== undefined) {
      Object.defineProperty(process, "stdin", {
        configurable: true,
        value: Readable.from([options.stdin]),
      });
    }
    if (options.env) {
      for (const [key, value] of Object.entries(options.env)) {
        previousEnv.set(key, process.env[key]);
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    }
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
    for (const [key, value] of previousEnv) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
    logSpy.mockRestore();
    errorSpy.mockRestore();
    exitSpy.mockRestore();
    if (options.stdin !== undefined && stdinDescriptor) {
      Object.defineProperty(process, "stdin", stdinDescriptor);
    }
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
      "validate",
      "check",
      "review",
      "gather",
      "checks",
      "skill install",
    ]) {
      expect(result.stdout).toContain(command);
    }
    expect(result.stdout).toContain("ghost --help --all");
    expect(result.stdout).not.toContain("relay");
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
    expect(result.stdout).toContain("Maintenance/legacy");
    for (const command of [
      "validate [file]",
      "init",
      "scan [dir]",
      "signals [path]",
      "gather",
      "checks",
      "manifest",
      "migrate",
      "skill <action>",
      "review",
    ]) {
      expect(result.stdout).toContain(command);
    }
  });

  it("emits a self-describing JSON manifest of commands and flags", async () => {
    const result = await runCli(["manifest", "--format", "json"], dir);

    expect(result.code).toBe(0);
    const manifest = JSON.parse(result.stdout);
    expect(manifest.apiVersion).toBe(1);
    expect(manifest.type).toBe("manifest");
    expect(manifest.data.tool).toBe("ghost");

    const names = manifest.data.commands.map(
      (command: { name: string }) => command.name,
    );
    expect(names).toContain("gather");
    expect(names).toContain("manifest");

    const gather = manifest.data.commands.find(
      (command: { name: string }) => command.name === "gather",
    );
    expect(gather.group).toBe("core");
    expect(typeof gather.summary).toBe("string");
    expect(Array.isArray(gather.options)).toBe(true);

    const globalNames = manifest.data.globalOptions.map(
      (option: { name: string }) => option.name,
    );
    expect(globalNames).toContain("help");
  });

  it("rejects a non-json manifest format with a usage error", async () => {
    const result = await runCli(["manifest", "--format", "text"], dir, {
      allowNoExit: true,
    });

    expect(result.code).toBe(2);
    expect(result.stderr).toContain("--format json");
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
    expect(Object.keys(initOutput).sort()).toEqual(["dir", "written"]);
    // Node package: manifest + the package-root core index node, no facet files.
    expect(initOutput.written).toContain("manifest.yml");
    expect(initOutput.written).toContain("index.md");
    await expect(
      readFile(join(dir, ".ghost", "manifest.yml"), "utf-8"),
    ).resolves.toContain("schema: ghost.fingerprint-package/v1");
    const status = JSON.parse(scan.stdout);
    expect(status.cache).toBeUndefined();

    const validate = await runCli(["validate"], dir);
    const review = await runCli(["review", "--diff", "change.patch"], dir);

    expect(validate.code).toBe(0);
    expect(review.code).toBe(0);
    expect(review.stdout).toContain("## Touched Surfaces");
  });

  it("uses GHOST_PACKAGE_DIR as the default fingerprint package directory for init", async () => {
    const init = await runCli(["init", "--format", "json"], dir, {
      env: { GHOST_PACKAGE_DIR: ".agents/ghost" },
    });

    expect(init.code).toBe(0);
    const initOutput = JSON.parse(init.stdout);
    expect(await realpath(initOutput.dir)).toBe(
      await realpath(join(dir, ".agents", "ghost")),
    );
    await expect(
      readFile(join(dir, ".agents", "ghost", "manifest.yml"), "utf-8"),
    ).resolves.toContain("schema: ghost.fingerprint-package/v1");
    await expect(
      readFile(join(dir, ".ghost", "manifest.yml"), "utf-8"),
    ).rejects.toThrow();
  });

  it("keeps exact init package args ahead of invalid GHOST_PACKAGE_DIR", async () => {
    const init = await runCli(
      ["init", "--package", "custom-dir", "--format", "json"],
      dir,
      {
        env: { GHOST_PACKAGE_DIR: "../outside" },
      },
    );

    expect(init.code).toBe(0);
    const initOutput = JSON.parse(init.stdout);
    expect(await realpath(initOutput.dir)).toBe(
      await realpath(join(dir, "custom-dir")),
    );
    await expect(
      readFile(join(dir, "custom-dir", "manifest.yml"), "utf-8"),
    ).resolves.toContain("schema: ghost.fingerprint-package/v1");
    await expect(
      readFile(join(dir, ".ghost", "manifest.yml"), "utf-8"),
    ).rejects.toThrow();
  });

  it("rejects removed positional init package args with a migration hint", async () => {
    const init = await runCli(["init", "custom-dir", "--format", "json"], dir);

    expect(init.code).toBe(2);
    expect(init.stderr).toContain(
      "ghost init no longer accepts a positional directory",
    );
    expect(init.stderr).toContain("--package <dir>");
    await expect(
      readFile(join(dir, ".ghost", "manifest.yml"), "utf-8"),
    ).rejects.toThrow();
    await expect(
      readFile(join(dir, "custom-dir", "manifest.yml"), "utf-8"),
    ).rejects.toThrow();
  });

  it("rejects invalid GHOST_PACKAGE_DIR with env validation errors", async () => {
    const init = await runCli(["init"], dir, {
      env: { GHOST_PACKAGE_DIR: "../outside" },
    });

    expect(init.code).toBe(2);
    expect(init.stderr).toContain("GHOST_PACKAGE_DIR must not contain");
  });

  it("exits 2 for a usage error surfaced by a thrown UsageError", async () => {
    // A bad flag value is a usage error even when it throws from deep in a
    // helper, not an unexpected crash: it must exit 2, not 1.
    const bad = await runCli(["skill", "install", "--agent", "nope"], dir, {
      allowNoExit: true,
    });
    expect(bad.code).toBe(2);
    expect(bad.stderr).toContain("--agent must be one of");
  });

  it("exits 2 with guidance when no fingerprint package is present", async () => {
    // A missing package is a usage error (run `ghost init`), not a raw crash.
    const result = await runCli(["gather", "core"], dir, {
      allowNoExit: true,
    });
    expect(result.code).toBe(2);
    expect(result.stderr).toContain("No Ghost fingerprint package found");
  });

  it("uses GHOST_PACKAGE_DIR as the default package lookup for scan", async () => {
    await runCli(["init", "--package", ".agents/ghost"], dir);

    const scan = await runCli(["scan", "--format", "json"], dir, {
      env: { GHOST_PACKAGE_DIR: ".agents/ghost" },
    });

    expect(scan.code).toBe(0);
    const status = JSON.parse(scan.stdout);
    expect(await realpath(status.dir)).toBe(
      await realpath(join(dir, ".agents", "ghost")),
    );
    expect(status.fingerprint.state).toBe("present");
  });

  it("refuses to overwrite existing fingerprint files unless forced", async () => {
    await runCli(["init"], dir);
    await writeFile(
      join(dir, ".ghost", "index.md"),
      "---\n---\n\nCurated Surface voice.\n",
    );

    const refused = await runCli(["init"], dir);

    expect(refused.code).toBe(2);
    expect(refused.stderr).toContain(
      "Refusing to overwrite existing Ghost fingerprint file(s)",
    );
    await expect(
      readFile(join(dir, ".ghost", "index.md"), "utf-8"),
    ).resolves.toContain("Curated Surface");

    const forced = await runCli(["init", "--force"], dir);

    expect(forced.code).toBe(0);
    await expect(
      readFile(join(dir, ".ghost", "index.md"), "utf-8"),
    ).resolves.toContain("intent / inventory / composition");
  });

  it("does not guess arbitrary YAML files are validate.yml", async () => {
    await writeFile(join(dir, "workflow.yml"), "name: ci\non: push\n");

    const lint = await runCli(
      ["validate", "workflow.yml", "--format", "json"],
      dir,
    );

    expect(lint.code).toBe(1);
    expect(JSON.parse(lint.stdout).issues[0]).toMatchObject({
      severity: "error",
      rule: "unsupported-artifact",
    });
  });

  it("detects Ghost YAML artifacts by schema when the filename is arbitrary", async () => {
    await writeFile(
      join(dir, "package-anchor.yml"),
      "schema: ghost.fingerprint-package/v1\nid: local\n",
    );

    const lint = await runCli(
      ["validate", "package-anchor.yml", "--format", "json"],
      dir,
    );

    expect(lint.code).toBe(0);
    expect(JSON.parse(lint.stdout).errors).toBe(0);
  });

  it("initializes a bundle and reports fingerprint capture state as json", async () => {
    const init = await runCli(["init"], dir);
    const scan = await runCli(["scan", "--format", "json"], dir);
    const scanHuman = await runCli(["scan"], dir);

    expect(init.code).toBe(0);
    expect(init.stdout).toContain("manifest.yml");
    expect(init.stdout).toContain("index.md");
    expect(init.stdout).not.toContain("cache/:");
    expect(init.stdout).not.toContain("memory/intent.md:");
    expect(
      await readFile(join(dir, ".ghost", "manifest.yml"), "utf-8"),
    ).toContain("schema: ghost.fingerprint-package/v1");
    expect(scan.code).toBe(0);
    const status = JSON.parse(scan.stdout);
    expect(status.fingerprint.state).toBe("present");
    expect(status.proposals).toBeUndefined();
    expect(status.cache).toBeUndefined();
    expect(status.readiness).toBeUndefined();
    expect(status.checks).toBeUndefined();
    // The default template seeds one core node, so the package contributes.
    expect(status.contribution.state).toBe("contributing");
    expect(status.contribution.node_count).toBe(1);
    expect(scanHuman.stdout).toContain("package dir:");
    expect(scanHuman.stdout).toContain("contribution: contributing");
    expect(scanHuman.stdout).toContain("nodes: 1");
    expect(scanHuman.stdout).not.toContain("readiness:");
    expect(scanHuman.stdout).not.toContain("memory dir:");
  });

  it("rejects removed init intent flag", async () => {
    await expect(runCli(["init", "--with-intent"], dir)).rejects.toThrow(
      "Unknown option `--withIntent`",
    );
  });

  it("rejects the removed --reference init flag", async () => {
    await expect(
      runCli(["init", "--reference", "packages/ghost-ui/.ghost"], dir),
    ).rejects.toThrow("Unknown option `--reference`");
  });

  it("init --force gathers cleanly on the scaffolded node package", async () => {
    const init = await runCli(["init", "--format", "json"], dir);
    expect(init.code).toBe(0);
    const lint = await runCli(["validate"], dir);
    expect(lint.code).toBe(0);

    // The seed node is the package-root index — the core node itself.
    const gather = await runCli(["gather", "core", "--format", "json"], dir);
    expect(gather.code).toBe(0);
    const slice = JSON.parse(gather.stdout);
    expect(slice.nodes.some((n: { id: string }) => n.id === "core")).toBe(true);
  });

  it("runs signals and validate from the unified cli", async () => {
    await writeCheckPackage(dir);
    const signals = await runCli(["signals"], dir);
    const validate = await runCli(["validate"], dir);

    expect(signals.code).toBe(0);
    expect(await realpath(JSON.parse(signals.stdout).root)).toBe(
      await realpath(dir),
    );
    expect(validate.code).toBe(0);
    expect(validate.stdout).toContain("0 error");
  });

  // Phase 3: asserts path/scope/surface_type selection reasons (dormant Job 2,
  // rebuilt as `gather` in Phase 5/7). Skipped until then.
  it.skip("gathers Relay context as json from an exact package", async () => {
    await writeCheckPackage(dir);

    const result = await runCli(
      [
        "relay",
        "gather",
        "Code/Features/Lending/LendingUI",
        "--package",
        ".ghost",
        "--format",
        "json",
      ],
      dir,
    );

    expect(result.code).toBe(0);
    const json = JSON.parse(result.stdout);
    expect(json.schema).toBe("ghost.relay.gather/v2");
    expect(json).toHaveProperty("context");
    expect(json).toHaveProperty("selected_context");
    expect(json).toHaveProperty("source");
    expect(json).toHaveProperty("targetPaths");
    expect(json).toHaveProperty("stackDirs");
    expect(json).toHaveProperty("brief");
    expect(json.source.kind).toBe("package");
    expect(json.targetPaths).toEqual(["Code/Features/Lending/LendingUI"]);
    expect(json.stackDirs).toHaveLength(1);
    expect(typeof json.brief).toBe("string");
    expect(json.context.schema).toBe("ghost.relay-context/v1");
    expect(json).not.toHaveProperty("context_packet");
    expect(json.context.target).toMatchObject({
      mode: "generation",
      paths: ["Code/Features/Lending/LendingUI"],
    });
    expect(json.context.sections.intent).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ref: "intent.principle:tokenized-ui-color",
          source: "intent.yml",
        }),
      ]),
    );
    expect(json.entrypoint).toBeUndefined();
    expect(json.cascade_brief).toBeUndefined();
    expect(json.selected_context.match.status).toBe("path-match");
    expect(json.selected_context).not.toHaveProperty("intent");
    expect(json.selected_context).not.toHaveProperty("composition");
    expect(json.selected_context).not.toHaveProperty("inventory");
    expect(json.selected_context).not.toHaveProperty("validation");
    expect(json.selected_context).not.toHaveProperty("guidance");
    expect(json.selected_context).not.toHaveProperty("active_obligations");
    expect(json.selected_context.context_hits).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ref: "intent.principle:tokenized-ui-color",
          kind: "intent",
          why_selected: expect.arrayContaining([
            {
              kind: "linked_ref",
              value: "inventory.exemplar:lending-tokenized-screen",
            },
          ]),
        }),
        expect.objectContaining({
          ref: "composition.pattern:tokenized-ui-color",
          kind: "composition",
        }),
        expect.objectContaining({
          ref: "inventory.exemplar:lending-tokenized-screen",
          kind: "inventory",
          path: "Code/Features/Lending/LendingUI",
          why_selected: expect.arrayContaining([
            { kind: "path", value: "Code/Features/Lending/LendingUI" },
            { kind: "scope", value: "lending" },
            { kind: "surface_type", value: "native-feature" },
          ]),
        }),
        expect.objectContaining({
          ref: "validate.check:no-hardcoded-ui-color",
          kind: "validation",
        }),
      ]),
    );
    expect(
      json.selected_context.context_hits.map((hit: { ref: string }) => hit.ref),
    ).not.toContain("validate.check:candidate-density-check");
    expect(json.selected_context.suggested_reads).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "Code/Features/Lending/LendingUI",
          reason:
            "source surface for inventory.exemplar:lending-tokenized-screen",
        }),
      ]),
    );
    expect(json.brief).toContain("# Ghost Relay Brief");
    expect(json.brief).toContain("## Context Hits");
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
    ).resolves.toContain("When Fingerprint Facets Are Silent");
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
    ).resolves.toContain("grounding is silent");
    await expect(
      readFile(join(dir, "skills", "ghost", "references", "brief.md"), "utf-8"),
    ).resolves.toContain("ghost gather <surface> --format json");
    await expect(
      readFile(
        join(dir, "skills", "ghost", "references", "verify.md"),
        "utf-8",
      ),
    ).resolves.toContain("ghost gather <surface> --format json");
    await expect(
      readFile(
        join(dir, "skills", "ghost", "references", "review.md"),
        "utf-8",
      ),
    ).resolves.toContain("ghost checks --surface <ids> --format json");
    await expect(
      readFile(
        join(dir, "skills", "ghost", "references", "propose.md"),
        "utf-8",
      ),
    ).rejects.toThrow();
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
    expect(result.stdout).toContain("## Touched Surfaces");
    expect(result.stdout).toContain("## Checks");
    expect(result.stdout).toContain("## Grounding");
    expect(result.stdout).toContain("diff location");
    expect(result.stdout).toContain("surface the change touches");
    expect(result.stdout).toContain(
      "grounding ref (why / what) or local-evidence rationale when the surface is silent",
    );
    expect(result.stdout).toContain("Read the grounded nodes");
    expect(result.stdout).toContain("the applicable check when blocking");
    expect(result.stdout).not.toContain("Proposal Threshold");
    expect(result.stdout).toContain("provisional and non-Ghost-backed");
    expect(result.stdout).not.toContain("recommend-proposal");
    expect(result.stdout).toContain("missing-fingerprint");
    expect(result.stdout).toContain("experience-gap");
    expect(result.stdout).toContain("repair or intentional-divergence");
    expect(result.stdout).not.toContain("schema: ghost.fingerprint/v1");
  });

  it("review reports and truncates oversized diffs by byte budget", async () => {
    await writeCheckPackage(dir);
    await writeFile(
      join(dir, "change.patch"),
      lendingPatch(`const copy = "${"x".repeat(160)}";`),
    );

    const result = await runCli(
      [
        "review",
        "--diff",
        "change.patch",
        "--max-diff-bytes",
        "80",
        "--format",
        "json",
      ],
      dir,
    );

    expect(result.code).toBe(0);
    const packet = JSON.parse(result.stdout);
    expect(packet.truncated).toBe(true);
    expect(packet.budgets.max_diff_bytes).toBe(80);
    expect(packet.budgets.diff_bytes).toBeGreaterThan(80);
    expect(packet.budgets.included_diff_bytes).toBeLessThanOrEqual(80);
    expect(packet.diff).toContain("Ghost truncated diff");
    expect(packet.diff).not.toContain("x".repeat(120));
  });

  it("review markdown includes packet budget metadata", async () => {
    await writeCheckPackage(dir);
    await writeFile(
      join(dir, "change.patch"),
      lendingPatch(`const copy = "${"x".repeat(160)}";`),
    );

    const result = await runCli(
      ["review", "--diff", "change.patch", "--max-diff-bytes", "80"],
      dir,
    );

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("## Review Packet Budget");
    expect(result.stdout).toContain("- Max diff bytes: 80");
    expect(result.stdout).toContain("- Truncated: yes");
    expect(result.stdout).toContain("Ghost truncated diff");
  });

  it("review rejects invalid max diff byte budgets", async () => {
    await writeCheckPackage(dir);
    await writeFile(
      join(dir, "change.patch"),
      lendingPatch("let color = CashTheme.primary"),
    );

    const result = await runCli(
      ["review", "--diff", "change.patch", "--max-diff-bytes", "0"],
      dir,
    );

    expect(result.code).toBe(2);
    expect(result.stderr).toContain(
      "--max-diff-bytes must be a positive integer",
    );
  });

  it("review omits removed memory fields", async () => {
    await writeCheckPackage(dir);
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
    expect(packet.schema).toBe("ghost.advisory-review/v1");
    expect(packet.finding_categories).toContain("experience-gap");
    expect(Array.isArray(packet.touched_surfaces)).toBe(true);
    expect(Array.isArray(packet.checks)).toBe(true);
    expect(Array.isArray(packet.grounding)).toBe(true);
    expect(packet.proposal_types).toBeUndefined();
    expect(packet.open_proposals).toBeUndefined();
    expect(packet.accepted_decisions).toBeUndefined();
    expect(packet.intent).toBeUndefined();
    expect(packet.memory).toBeUndefined();
  });

  it("rejects removed review memory flag", async () => {
    await writeCheckPackage(dir);
    await writeFile(
      join(dir, "change.patch"),
      lendingPatch("let color = CashTheme.primary"),
    );

    await expect(
      runCli(
        [
          "review",
          "--diff",
          "change.patch",
          "--include-memory",
          "--format",
          "json",
        ],
        dir,
      ),
    ).rejects.toThrow("Unknown option `--includeMemory`");
  });

  it("review uses agent-stated surfaces and embeds the diff", async () => {
    await writeSplitFingerprintPackage(
      join(dir, ".ghost"),
      `schema: ghost.fingerprint/v1
intent:
  summary:
    product: Root Product
  situations: []
  principles: []
  experience_contracts: []
inventory:
  building_blocks:
    tokens: [RootTheme]
composition:
  patterns:
    - id: root-token-pattern
      kind: visual
      pattern: Web UI color uses semantic product tokens.
`,
    );
    await writeFile(
      join(dir, "change.patch"),
      [
        webPatch("apps/checkout/review/page.tsx", "const x = CheckoutTheme;"),
        webPatch("shared/home.tsx", "const x = RootTheme;"),
      ].join("\n"),
    );

    const result = await runCli(
      [
        "review",
        "--diff",
        "change.patch",
        "--surface",
        "core",
        "--format",
        "json",
      ],
      dir,
    );

    expect(result.code).toBe(0);
    const packet = JSON.parse(result.stdout);
    // Review is surface-based and agent-stated: the agent names the surfaces;
    // the diff is embedded verbatim, never used to resolve surfaces.
    expect(packet.stacks).toBeUndefined();
    expect(packet.touched_surfaces).toEqual(["core"]);
    expect(Array.isArray(packet.grounding)).toBe(true);
    expect(packet.diff).toContain("CheckoutTheme");
  });

  it("gathers a composed slice for a surface", async () => {
    await writeGatherPackage(dir);

    const result = await runCli(
      ["gather", "email/marketing", "--package", ".ghost", "--format", "json"],
      dir,
    );

    expect(result.code).toBe(0);
    const slice = JSON.parse(result.stdout);
    expect(slice.surface).toBe("email/marketing");
    const byId = Object.fromEntries(
      slice.nodes.map((node: { id: string; provenance: unknown }) => [
        node.id,
        node.provenance,
      ]),
    );
    // Graph slice (Option A, prose nodes): own + cascaded ancestors.
    // The root index (`core`) cascades; the marketing index node is own.
    expect(byId.core).toEqual({ kind: "ancestor", from: "core" });
    expect(byId["email/marketing"]).toEqual({ kind: "own" });
    // checkout/clarity sits on a sibling surface with no `relates` link in, so
    // it is not pulled in.
    expect(byId["checkout/clarity"]).toBeUndefined();
  });

  it("filters the gather slice by incarnation via --as", async () => {
    await writeIncarnationPackage(dir);

    const web = await runCli(
      [
        "gather",
        "launch",
        "--as",
        "web",
        "--package",
        ".ghost",
        "--format",
        "json",
      ],
      dir,
    );
    expect(web.code).toBe(0);
    const slice = JSON.parse(web.stdout);
    expect(slice.incarnation).toBe("web");
    const ids = slice.nodes.map((n: { id: string }) => n.id).sort();
    // essence (untagged) + matching web; the email node is filtered out.
    expect(ids).toContain("launch");
    expect(ids).toContain("launch/web");
    expect(ids).not.toContain("launch/email");
  });

  it("inherits nodes from an extended package via extends", async () => {
    // Brand contract: a node at brand/core-trust.md → id `core-trust`.
    await mkdir(join(dir, "brand"), { recursive: true });
    await writeFile(
      join(dir, "brand", "manifest.yml"),
      "schema: ghost.fingerprint-package/v1\nid: brand\n",
    );
    await writeFile(
      join(dir, "brand", "core-trust.md"),
      "---\n---\n\nReduce felt risk.\n",
    );
    // Product contract extends the brand. The checkout surface is the
    // directory `product/checkout/`, with a node at checkout/trust.md.
    await mkdir(join(dir, "product", "checkout"), { recursive: true });
    await writeFile(
      join(dir, "product", "manifest.yml"),
      "schema: ghost.fingerprint-package/v1\nid: acme-checkout\nextends:\n  brand: ../brand\n",
    );
    await writeFile(
      join(dir, "product", "checkout", "trust.md"),
      "---\nrelates:\n  - to: brand:core-trust\n    as: reinforces\n---\n\nReassure at payment.\n",
    );

    const validate = await runCli(
      ["validate", "product", "--format", "json"],
      dir,
    );
    expect(validate.code).toBe(0);

    const gather = await runCli(
      ["gather", "checkout", "--package", "product", "--format", "json"],
      dir,
    );
    expect(gather.code).toBe(0);
    const slice = JSON.parse(gather.stdout);
    const inherited = slice.nodes.find(
      (n: { id: string }) => n.id === "brand:core-trust",
    );
    // The cross-package relation pulled the inherited brand node into the slice.
    expect(inherited).toBeDefined();
    expect(inherited.body).toContain("Reduce felt risk");
  });

  it("fails validate when a cross-package ref is not in extends", async () => {
    await writeFile(
      join(dir, "manifest.yml"),
      "schema: ghost.fingerprint-package/v1\nid: solo\n",
    );
    await writeFile(
      join(dir, "n.md"),
      "---\nrelates:\n  - to: brand:core-trust\n---\n\nBody.\n",
    );

    const validate = await runCli(["validate", "."], dir);
    expect(validate.code).toBe(1);
    expect(validate.stdout).toContain("brand:core-trust");
  });

  it("returns the surface menu when no surface is named", async () => {
    await writeGatherPackage(dir);

    const result = await runCli(
      ["gather", "--package", ".ghost", "--format", "json"],
      dir,
    );

    expect(result.code).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.kind).toBe("menu");
    expect(payload.surfaces.map((entry: { id: string }) => entry.id)).toContain(
      "email/marketing",
    );
  });

  it("ranks closest candidates for an inexact gather query", async () => {
    await writeGatherPackage(dir);

    const result = await runCli(
      ["gather", "marketng", "--package", ".ghost", "--format", "json"],
      dir,
      { allowNoExit: true },
    );

    expect(result.code).toBe(2);
    const payload = JSON.parse(result.stdout);
    expect(payload.kind).toBe("candidates");
    expect(payload.code).toBe("ERR_UNKNOWN_SURFACE");
    expect(payload.candidates.map((c: { id: string }) => c.id)).toContain(
      "email/marketing",
    );
  });

  it("matches a gather query by phrase against descriptions", async () => {
    await writeGatherPackage(dir);

    const result = await runCli(
      ["gather", "marketing email", "--package", ".ghost", "--format", "json"],
      dir,
      { allowNoExit: true },
    );

    expect(result.code).toBe(2);
    const payload = JSON.parse(result.stdout);
    expect(payload.candidates[0].id).toBe("email/marketing");
  });

  it("returns an empty candidate set for a gather query with no match", async () => {
    await writeGatherPackage(dir);

    const result = await runCli(
      ["gather", "zzzzznope", "--package", ".ghost", "--format", "json"],
      dir,
      { allowNoExit: true },
    );

    expect(result.code).toBe(2);
    const payload = JSON.parse(result.stdout);
    expect(payload.kind).toBe("candidates");
    expect(payload.candidates).toEqual([]);
  });

  it("errors with ERR_UNKNOWN_SURFACE when checks names an unknown surface", async () => {
    await writeGatherPackage(dir);

    const result = await runCli(
      [
        "checks",
        "--surface",
        "checkou",
        "--package",
        ".ghost",
        "--format",
        "json",
      ],
      dir,
      { allowNoExit: true },
    );

    expect(result.code).toBe(2);
    const payload = JSON.parse(result.stdout);
    expect(payload.code).toBe("ERR_UNKNOWN_SURFACE");
    expect(payload.unknown[0].suggestions).toContain("checkout");
  });

  it("migrates a legacy package to the surface model", async () => {
    const ghost = join(dir, ".ghost");
    await mkdir(ghost, { recursive: true });
    await writeFile(
      join(ghost, "manifest.yml"),
      "schema: ghost.fingerprint-package/v1\nid: legacy\n",
    );
    await writeFile(
      join(ghost, "inventory.yml"),
      `topology:
  scopes:
    - id: lending
      paths: [Code/Lending]
building_blocks: {}
exemplars: []
sources: []
`,
    );
    await writeFile(
      join(ghost, "intent.yml"),
      `principles:
  - id: scoped
    principle: Placed cleanly.
    applies_to:
      scopes: [lending]
experience_contracts: []
`,
    );
    await writeFile(join(ghost, "composition.yml"), "patterns: []\n");

    const result = await runCli(
      ["migrate", ".ghost", "--force", "--format", "json"],
      dir,
    );

    expect(result.code).toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report.surfaces).toEqual(["lending"]);

    // The migrated package must lint clean and gather correctly.
    const lint = await runCli(["validate", ".ghost"], dir, {
      allowNoExit: true,
    });
    expect(lint.stdout).toContain("0 error(s)");

    const gather = await runCli(
      ["gather", "lending", "--package", ".ghost", "--format", "json"],
      dir,
    );
    const slice = JSON.parse(gather.stdout);
    // The single-scope node landed at lending/scoped.md → id `lending/scoped`.
    expect(
      slice.nodes.find((node: { id: string }) => node.id === "lending/scoped")
        ?.provenance,
    ).toEqual({ kind: "own" });
  });

  it("refuses non-legacy packages", async () => {
    await writeGatherPackage(dir);

    const result = await runCli(["migrate", ".ghost"], dir, {
      allowNoExit: true,
    });

    expect(result.code).toBe(2);
    expect(result.stderr).toContain("Nothing to migrate");
  });

  it("lists every check (checks always fire) and grounds the named surface", async () => {
    const ghost = join(dir, ".ghost");
    await mkdir(join(ghost, "checks"), { recursive: true });
    await writeFile(
      join(ghost, "manifest.yml"),
      "schema: ghost.fingerprint-package/v1\nid: c3\n",
    );
    // Surfaces are directories: checkout/ and email/ each with an index node.
    await mkdir(join(ghost, "checkout"), { recursive: true });
    await mkdir(join(ghost, "email"), { recursive: true });
    await writeFile(
      join(ghost, "checkout", "index.md"),
      "---\n---\n\nCheckout.\n",
    );
    await writeFile(join(ghost, "email", "index.md"), "---\n---\n\nEmail.\n");
    await writeFile(
      join(ghost, "checks", "brand.md"),
      "---\nname: brand\ndescription: Brand voice.\nseverity: medium\n---\n## Instructions\nVoice.\n",
    );
    await writeFile(
      join(ghost, "checks", "checkout.md"),
      "---\nname: checkout-color\ndescription: No raw color.\nseverity: high\nsource: checkout > Color\n---\n## Instructions\nFlag hex.\n",
    );
    await writeFile(
      join(ghost, "checks", "email.md"),
      "---\nname: email-links\ndescription: Email links.\nseverity: low\n---\n## Instructions\nLinks.\n",
    );

    const result = await runCli(
      [
        "checks",
        "--surface",
        "checkout",
        "--package",
        ".ghost",
        "--format",
        "json",
      ],
      dir,
    );

    expect(result.code).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.touched_surfaces).toContain("checkout");
    // Every check is offered — routing is gone; the agent judges relevance.
    const names = payload.checks.map((c: { name: string }) => c.name).sort();
    expect(names).toEqual(["brand", "checkout-color", "email-links"]);
    const checkoutColor = payload.checks.find(
      (c: { name: string }) => c.name === "checkout-color",
    );
    expect(checkoutColor.source).toBe("checkout > Color");
  });

  it("grounds the named surface in the fingerprint slice", async () => {
    const ghost = join(dir, ".ghost");
    await mkdir(join(ghost, "checks"), { recursive: true });
    await mkdir(join(ghost, "nodes"), { recursive: true });
    await writeFile(
      join(ghost, "manifest.yml"),
      "schema: ghost.fingerprint-package/v1\nid: c4\n",
    );
    // core prose at the package root; checkout surface as a directory node.
    await mkdir(join(ghost, "checkout"), { recursive: true });
    await writeFile(join(ghost, "index.md"), "---\n---\n\nWarm everywhere.\n");
    await writeFile(
      join(ghost, "checkout", "clarity.md"),
      "---\n---\n\nCheckout copy is plain.\n",
    );
    await writeFile(
      join(ghost, "checks", "checkout.md"),
      "---\nname: checkout-color\ndescription: No raw color.\nseverity: high\nsource: checkout > Color\n---\n## Instructions\nFlag hex.\n",
    );

    const result = await runCli(
      [
        "checks",
        "--surface",
        "checkout",
        "--package",
        ".ghost",
        "--format",
        "json",
      ],
      dir,
    );

    expect(result.code).toBe(0);
    const payload = JSON.parse(result.stdout);
    const checkout = payload.grounding.find(
      (g: { surface: string }) => g.surface === "checkout",
    );
    // Grounding is the gather slice: prose nodes by provenance (Phase 4).
    const ids = checkout.nodes.map((n: { id: string }) => n.id);
    expect(ids).toContain("checkout/clarity"); // own
    expect(ids).toContain("core"); // cascades from the root index
    const own = checkout.nodes.find(
      (n: { id: string }) => n.id === "checkout/clarity",
    );
    expect(own.provenance).toEqual({ kind: "own" });
  });

  it("omits grounding with --no-grounding", async () => {
    const ghost = join(dir, ".ghost");
    await mkdir(join(ghost, "checks"), { recursive: true });
    await writeFile(
      join(ghost, "manifest.yml"),
      "schema: ghost.fingerprint-package/v1\nid: c4b\n",
    );
    await mkdir(join(ghost, "checkout"), { recursive: true });
    await writeFile(
      join(ghost, "checkout", "index.md"),
      "---\n---\n\nCheckout.\n",
    );

    const result = await runCli(
      [
        "checks",
        "--surface",
        "checkout",
        "--package",
        ".ghost",
        "--no-grounding",
        "--format",
        "json",
      ],
      dir,
    );

    expect(result.code).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.grounding).toBeUndefined();
  });
});

async function writeIncarnationPackage(dir: string): Promise<void> {
  const ghost = join(dir, ".ghost");
  await mkdir(join(ghost, "nodes"), { recursive: true });
  await writeFile(
    join(ghost, "manifest.yml"),
    "schema: ghost.fingerprint-package/v1\nid: incarnation-demo\n",
  );
  // launch surface as a directory; web/email incarnations as nodes under it.
  await mkdir(join(ghost, "launch"), { recursive: true });
  await writeFile(
    join(ghost, "launch", "index.md"),
    "---\n---\n\nOne idea, stated with confidence.\n",
  );
  await writeFile(
    join(ghost, "launch", "web.md"),
    "---\nincarnation: web\n---\n\nHero with one CTA.\n",
  );
  await writeFile(
    join(ghost, "launch", "email.md"),
    "---\nincarnation: email\n---\n\nSubject is the headline.\n",
  );
}

async function writeGatherPackage(dir: string): Promise<void> {
  const ghost = join(dir, ".ghost");
  await mkdir(join(ghost, "email", "marketing"), { recursive: true });
  await mkdir(join(ghost, "checkout"), { recursive: true });
  await writeFile(
    join(ghost, "manifest.yml"),
    "schema: ghost.fingerprint-package/v1\nid: gather-demo\n",
  );
  // Surfaces are directories: email/ (with marketing/ nested) and checkout/.
  // The root index is the brand voice that cascades everywhere.
  await writeFile(
    join(ghost, "index.md"),
    "---\ndescription: Brand voice.\n---\n\nWarm and concise.\n",
  );
  await writeFile(
    join(ghost, "email", "index.md"),
    "---\ndescription: Email surface.\n---\n\nEmail.\n",
  );
  await writeFile(
    join(ghost, "email", "marketing", "index.md"),
    "---\ndescription: Marketing email.\n---\n\nMarketing may use urgency.\n",
  );
  await writeFile(
    join(ghost, "checkout", "clarity.md"),
    "---\n---\n\nCheckout copy is plain.\n",
  );
}

async function writeCheckPackage(
  dir: string,
  options: { checks?: boolean; detectorPattern?: string } = {},
): Promise<void> {
  const pkg = join(dir, ".ghost");
  const detectorPattern =
    options.detectorPattern ?? "#[0-9a-fA-F]{3,8}|UIColor\\(";
  await mkdir(pkg, { recursive: true });
  await writeSplitFingerprintPackage(
    pkg,
    `schema: ghost.fingerprint/v1
intent:
  summary:
    product: Cash iOS
  situations: []
  principles:
    - id: tokenized-ui-color
      principle: UI colors should come from the product token system.
      check_refs: [validate.check:no-hardcoded-ui-color]
  experience_contracts: []
inventory:
  exemplars:
    - id: lending-tokenized-screen
      path: Code/Features/Lending/LendingUI
      title: Lending tokenized UI
      surface: lending
      why: Shows semantic CashTheme color usage for native lending UI.
      refs:
        - intent.principle:tokenized-ui-color
        - composition.pattern:tokenized-ui-color
  building_blocks:
    tokens: [CashTheme.primary]
    components: []
composition:
  patterns:
    - id: tokenized-ui-color
      kind: visual
      pattern: Product UI color uses semantic tokens instead of literals.
      check_refs: [validate.check:no-hardcoded-ui-color]
`,
    options.checks === false
      ? undefined
      : `schema: ghost.validate/v1
id: cash-ios
checks:
  - id: no-hardcoded-ui-color
    title: Use design tokens for UI color
    status: active
    severity: serious
    derivation:
      intent: [intent.principle:tokenized-ui-color]
      composition: [composition.pattern:tokenized-ui-color]
      inventory: [inventory.exemplar:lending-tokenized-screen]
    applies_to:
      paths: [Code/Features/Lending]
    detector:
      type: forbidden-regex
      pattern: '${detectorPattern}'
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
      intent: [intent.principle:tokenized-ui-color]
    applies_to:
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

async function _writeRelayRequestStackScenario(dir: string): Promise<void> {
  await mkdir(join(dir, "stacks"), { recursive: true });
  await mkdir(join(dir, "media", "email"), { recursive: true });
  await writeFile(
    join(dir, ".ghost", "relay.yml"),
    `schema: ghost.relay-config/v1
id: demo.product-surface/v1
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
`,
  );
  await writeFile(
    join(dir, "stacks", "portal.renewal-reminder.email.yml"),
    `schema: demo.stack/v1
id: portal.renewal-reminder.email
title: Portal renewal reminder via email
task_context:
  customer: subscriber
  system: systems.portal
  moment: moments.subscription-renewal-reminder
  medium: media.email
  capability: capabilities.billing
units:
  - media/email
`,
  );
  await writeFile(
    join(dir, "media", "email", "questions.yml"),
    `questions:
  - id: email-sensitive-detail
    question: What sensitive detail is safe in email?
`,
  );
}

async function _writeRelayRequestOnlyScenario(
  dir: string,
  options: { invalidUnitSection?: boolean } = {},
): Promise<void> {
  await mkdir(join(dir, ".agents", "ghost"), { recursive: true });
  await mkdir(join(dir, "stacks"), { recursive: true });
  await mkdir(join(dir, "media", "email"), { recursive: true });
  await writeFile(
    join(dir, ".agents", "ghost", "relay.yml"),
    `schema: ghost.relay-config/v1
id: demo.agent-context/v1
base:
  kind: none
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
        section: ${options.invalidUnitSection ? "composition" : "questions"}
        items: questions
        summary: question
`,
  );
  await writeFile(
    join(dir, "stacks", "portal.renewal-reminder.email.yml"),
    `schema: demo.stack/v1
id: portal.renewal-reminder.email
title: Portal renewal reminder via email
task_context:
  medium: media.email
units:
  - media/email
`,
  );
  await writeFile(
    join(dir, "media", "email", "questions.yml"),
    `questions:
  - id: email-sensitive-detail
    question: What sensitive detail is safe in email?
`,
  );
}

async function writeSplitFingerprintPackage(
  pkg: string,
  fingerprintRaw: string,
  checksRaw?: string,
): Promise<void> {
  // Node package: derive prose nodes from the legacy facet doc's
  // principles/patterns so check-routing/grounding fixtures keep working.
  const packageDir = pkg;
  const doc = parseYaml(fingerprintRaw) as {
    intent?: { principles?: Array<{ id: string; principle?: string }> };
    composition?: { patterns?: Array<{ id: string; pattern?: string }> };
  };
  await mkdir(join(packageDir, "nodes"), { recursive: true });
  const writes: Array<Promise<void>> = [
    writeFile(
      join(packageDir, "manifest.yml"),
      "schema: ghost.fingerprint-package/v1\nid: local\n",
    ),
  ];
  for (const p of doc.intent?.principles ?? []) {
    writes.push(
      writeFile(
        join(packageDir, "nodes", `${p.id}.md`),
        `---\nid: ${p.id}\nunder: core\n---\n\n${p.principle ?? p.id}\n`,
      ),
    );
  }
  for (const p of doc.composition?.patterns ?? []) {
    writes.push(
      writeFile(
        join(packageDir, "nodes", `${p.id}.md`),
        `---\nid: ${p.id}\nunder: core\n---\n\n${p.pattern ?? p.id}\n`,
      ),
    );
  }
  if (checksRaw) {
    writes.push(writeFile(join(packageDir, "validate.yml"), checksRaw));
  }
  await Promise.all(writes);
}

function _checksFileWithDerivation(intentRef: string): string {
  return `schema: ghost.validate/v1
id: local
checks:
  - id: no-hardcoded-ui-color
    title: Use design tokens for UI color
    status: active
    severity: serious
    derivation:
      intent: [${intentRef}]
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

function webPatch(path: string, added: string): string {
  return `diff --git a/${path} b/${path}
index 1111111..2222222 100644
--- a/${path}
+++ b/${path}
@@ -0,0 +1 @@
+${added}
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
