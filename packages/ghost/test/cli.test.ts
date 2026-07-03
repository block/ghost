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
      "validate",
      "gather",
      "pull",
      "pulse",
      "review",
      "haunt add|remove|list",
      "skill install",
    ]) {
      expect(result.stdout).toContain(command);
    }
    expect(result.stdout).toContain("ghost --help --all");
    // Removed in the graph collapse.
    expect(result.stdout).not.toContain("migrate");
    expect(result.stdout).not.toContain("relay");
  });

  it("prints the complete grouped command index with --help --all", async () => {
    const result = await runCli(["--help", "--all"], dir, {
      allowNoExit: true,
    });

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Core workflow");
    for (const command of [
      "validate [file]",
      "init",
      "gather [...ask]",
      "pull <...ids>",
      "pulse",
      "review",
      "haunt <action> [id]",
      "manifest",
      "skill <action>",
    ]) {
      expect(result.stdout).toContain(command);
    }
    // Removed in the graph collapse.
    expect(result.stdout).not.toContain("migrate");
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
    expect(names).toContain("pulse");
    expect(names).toContain("review");
    expect(names).toContain("haunt");
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

  it("initializes the default fingerprint package", async () => {
    const init = await runCli(["init", "--format", "json"], dir);

    expect(init.code).toBe(0);
    const initOutput = JSON.parse(init.stdout);
    expect(Object.keys(initOutput).sort()).toEqual(["dir", "written"]);
    expect(initOutput.written).toContain("manifest.yml");
    expect(initOutput.written).toContain("glossary.md");
    expect(initOutput.written).toContain("index.md");
    // Core init is fingerprint-only: haunts are opt-in via --with / haunt add.
    expect(initOutput.written).not.toContain("checks/example.md.example");
    await expect(
      readFile(join(dir, ".ghost", "manifest.yml"), "utf-8"),
    ).resolves.toContain("schema: ghost.fingerprint-package/v1");

    const validate = await runCli(["validate"], dir);
    expect(validate.code).toBe(0);
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
    // Goose is a first-class install destination.
    expect(bad.stderr).toContain("goose");
  });

  it("exits 2 with guidance when no fingerprint package is present", async () => {
    // A missing package is a usage error (run `ghost init`), not a raw crash.
    const result = await runCli(["gather"], dir, {
      allowNoExit: true,
    });
    expect(result.code).toBe(2);
    expect(result.stderr).toContain("No Ghost fingerprint package found");
  });

  it("uses GHOST_PACKAGE_DIR as the default package lookup for validate", async () => {
    await runCli(["init", "--package", ".agents/ghost"], dir);

    const validate = await runCli(["validate", "--format", "json"], dir, {
      env: { GHOST_PACKAGE_DIR: ".agents/ghost" },
    });

    expect(validate.code).toBe(0);
    expect(JSON.parse(validate.stdout).errors).toBe(0);
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
    ).resolves.toContain("The glossary declares the category vocabulary");
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

  it("initializes a bundle with manifest and starter index node", async () => {
    const init = await runCli(["init"], dir);

    expect(init.code).toBe(0);
    expect(init.stdout).toContain("manifest.yml");
    expect(init.stdout).toContain("glossary.md");
    expect(init.stdout).toContain("index.md");
    expect(init.stdout).not.toContain("cache/:");
    expect(init.stdout).not.toContain("memory/intent.md:");
    expect(
      await readFile(join(dir, ".ghost", "manifest.yml"), "utf-8"),
    ).toContain("schema: ghost.fingerprint-package/v1");

    const validate = await runCli(["validate", "--format", "json"], dir);
    expect(validate.code).toBe(0);
    expect(JSON.parse(validate.stdout).errors).toBe(0);
  });

  it("rejects removed init intent flag", async () => {
    await expect(runCli(["init", "--with-intent"], dir)).rejects.toThrow(
      "Unknown option `--withIntent`",
    );
  });

  it("rejects the removed --reference init flag", async () => {
    await expect(
      runCli(["init", "--reference", "packages/vessel/.ghost"], dir),
    ).rejects.toThrow("Unknown option `--reference`");
  });

  it("init --force gathers cleanly on the scaffolded node package", async () => {
    const init = await runCli(["init", "--format", "json"], dir);
    expect(init.code).toBe(0);
    const lint = await runCli(["validate"], dir);
    expect(lint.code).toBe(0);

    // The seed node is the package-root index.md — id `index`, listed like any other.
    const gather = await runCli(["gather", "--format", "json"], dir);
    expect(gather.code).toBe(0);
    const slice = JSON.parse(gather.stdout);
    expect(slice.nodes.some((n: { id: string }) => n.id === "index")).toBe(
      true,
    );
  });

  it("runs validate from the unified cli", async () => {
    await writeCheckPackage(dir);
    const validate = await runCli(["validate"], dir);

    expect(validate.code).toBe(0);
    expect(validate.stdout).toContain("0 error");
  });

  it("gather and pull append structured local events", async () => {
    await runCli(["init"], dir);
    await writeFile(
      join(dir, ".ghost", "principle.trust.md"),
      "---\ndescription: Trust at the payment moment.\n---\n\nNear payment, reduce felt risk.\n",
    );
    await writeFile(
      join(dir, ".ghost", "voice.md"),
      "---\ndescription: The brand voice.\n---\n\nPlain words. No hype.\n",
    );

    const gather = await runCli(
      ["gather", "checkout", "confirmation", "--format", "json"],
      dir,
    );
    expect(gather.code).toBe(0);
    const menuPayload = JSON.parse(gather.stdout);
    expect(menuPayload.ask).toBe("checkout confirmation");
    expect(
      menuPayload.nodes.some((n: { id: string }) => n.id === "voice"),
    ).toBe(true);

    const gatherMarkdown = await runCli(["gather", "checkout", "hero"], dir);
    expect(gatherMarkdown.stdout).toContain(
      "# Ghost Nodes — for: checkout hero",
    );

    const pull = await runCli(["pull", "principle.trust", "voice"], dir);
    expect(pull.code).toBe(0);
    expect(pull.stdout).toContain("Near payment, reduce felt risk.");
    expect(pull.stdout).toContain("Plain words. No hype.");

    // JSON format carries id, kind, description, and body.
    const json = await runCli(
      ["pull", "principle.trust", "--format", "json"],
      dir,
    );
    expect(json.code).toBe(0);
    const payload = JSON.parse(json.stdout);
    expect(payload.kind).toBe("pull");
    expect(payload.nodes[0]).toMatchObject({
      id: "principle.trust",
      kind: "principle",
      description: "Trust at the payment moment.",
    });
    expect(payload.nodes[0].body).toContain("reduce felt risk");

    // --no-history skips the event tape.
    await runCli(["pull", "voice", "--no-history"], dir);
    const events = (await readFile(join(dir, ".ghost", ".events"), "utf-8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(events.map((event: { event: string }) => event.event)).toEqual([
      "gather",
      "gather",
      "pull",
      "pull",
    ]);
    expect(events[0]).toMatchObject({
      event: "gather",
      ask: "checkout confirmation",
    });
    expect(events[0].menu).toContain("principle.trust");
    expect(events[2]).toMatchObject({
      event: "pull",
      ids: ["principle.trust", "voice"],
    });

    // The tape is a dotfile: never a node, and gitignored by the scaffold.
    const menu = JSON.parse(
      (await runCli(["gather", "--format", "json"], dir)).stdout,
    );
    expect(
      menu.nodes.some((n: { id: string }) => n.id.includes("events")),
    ).toBe(false);
    await expect(
      readFile(join(dir, ".ghost", ".gitignore"), "utf-8"),
    ).resolves.toContain(".events");
    const validate = await runCli(["validate"], dir);
    expect(validate.code).toBe(0);
  });

  it("pull partially succeeds with closest-id hints for unknown nodes", async () => {
    await runCli(["init"], dir);
    await writeFile(
      join(dir, ".ghost", "principle.trust.md"),
      "---\ndescription: Trust.\n---\n\nBody.\n",
    );

    const partial = await runCli(
      ["pull", "principle.trust", "principle.trst"],
      dir,
    );
    expect(partial.code).toBe(0);
    expect(partial.stdout).toContain("Body.");
    expect(partial.stderr).toContain("unknown node `principle.trst`");
    expect(partial.stderr).toContain("principle.trust");

    const onlyMiss = await runCli(["pull", "principle.trst"], dir, {
      allowNoExit: true,
    });
    expect(onlyMiss.code).toBe(2);
    expect(onlyMiss.stderr).toContain("unknown node `principle.trst`");

    const events = (await readFile(join(dir, ".ghost", ".events"), "utf-8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(events[0]).toMatchObject({
      event: "pull",
      ids: ["principle.trust"],
      missed: [{ requested: "principle.trst", suggested: ["principle.trust"] }],
    });
    expect(events[1]).toMatchObject({
      event: "pull",
      ids: [],
      missed: [{ requested: "principle.trst", suggested: ["principle.trust"] }],
    });
  });

  it("pulse reports local gather/pull metrics", async () => {
    await runCli(["init"], dir);
    await writeFile(
      join(dir, ".ghost", "principle.trust.md"),
      "---\ndescription: Trust.\n---\n\nBody.\n",
    );
    await writeFile(
      join(dir, ".ghost", "voice.md"),
      "---\ndescription: Voice.\n---\n\nPlain.\n",
    );

    await runCli(["gather", "checkout"], dir);
    await runCli(["pull", "principle.trust", "principle.trst"], dir);
    await runCli(["gather", "settings"], dir);

    const pulse = await runCli(["pulse", "--format", "json"], dir);
    expect(pulse.code).toBe(0);
    const report = JSON.parse(pulse.stdout);
    expect(report).toMatchObject({
      kind: "pulse",
      gathers: 2,
      pulls: 1,
      abandonedGathers: 1,
      pullsPerGather: 0.5,
    });
    const trust = report.nodes.find(
      (node: { id: string }) => node.id === "principle.trust",
    );
    expect(trust).toMatchObject({
      appearances: 2,
      pulls: 1,
      hitRate: 0.5,
    });
    expect(report.coldNodes).toContain("voice");
    expect(report.misses[0]).toMatchObject({
      requested: "principle.trst",
      count: 1,
      suggested: ["principle.trust"],
    });

    const md = await runCli(["pulse"], dir);
    expect(md.stdout).toContain("# Ghost Pulse");
    expect(md.stdout).toContain("- Abandoned gathers: 1");
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
      "references/inventory.md",
      "references/brief.md",
      "references/recall.md",
      "references/self-check.md",
      "references/schema.md",
      "references/authoring-scenarios.md",
    ]) {
      await expect(
        readFile(join(dir, "skills", "ghost", path), "utf-8"),
      ).resolves.toBeTruthy();
    }
    await expect(
      readFile(join(dir, "skills", "ghost", "SKILL.md"), "utf-8"),
    ).resolves.toContain("When the fingerprint is silent");
    await expect(
      readFile(join(dir, "skills", "ghost", "SKILL.md"), "utf-8"),
    ).resolves.toContain(
      "Never claim provisional or local-convention reasoning",
    );
    // The review/verify/remediate/critique recipes are not part of the
    // fingerprint skill bundle.
    for (const gone of [
      "review.md",
      "verify.md",
      "remediate.md",
      "critique.md",
    ]) {
      await expect(
        readFile(join(dir, "skills", "ghost", "references", gone), "utf-8"),
      ).rejects.toThrow();
    }
  });

  it("gather emits the full flat menu (no anchor, no slice)", async () => {
    await writeGatherPackage(dir);

    const result = await runCli(
      ["gather", "--package", ".ghost", "--format", "json"],
      dir,
    );

    expect(result.code).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.kind).toBe("menu");
    const ids = payload.nodes.map((node: { id: string }) => node.id);
    // Every authored node is offered; the agent selects. No cascade, no slice.
    // The id rule is uniform: path minus .md — index.md is id `index`.
    expect(ids).toContain("index");
    expect(ids).toContain("email/marketing/index");
    expect(ids).toContain("checkout/clarity");
  });

  it("gather shows material counts on nodes and never serves checks", async () => {
    await writeGatherPackage(dir);
    const checksHaunt = join(dir, ".ghost", "haunts", "checks");
    await mkdir(checksHaunt, { recursive: true });
    await writeFile(
      join(checksHaunt, "haunt.yml"),
      "schema: ghost.haunt/v1\nid: checks\n",
    );
    await writeFile(
      join(dir, ".ghost", "asset.logo.md"),
      "---\ndescription: Logo.\nmaterials:\n  - brand/logo.svg\n  - https://example.com/logo\n---\n\nLogo prose.\n",
    );
    await writeFile(
      join(checksHaunt, "secret-check.md"),
      "---\nname: secret-check\ndescription: Never served.\nseverity: high\nreferences:\n  - asset.logo\n---\n\nGrade it.\n",
    );

    const md = await runCli(["gather", "--package", ".ghost"], dir);
    expect(md.code).toBe(0);
    expect(md.stdout).toContain("`asset.logo`");
    expect(md.stdout).toContain("materials: 2");
    expect(md.stdout).not.toContain("secret-check");

    const json = await runCli(
      ["gather", "--package", ".ghost", "--format", "json"],
      dir,
    );
    expect(json.code).toBe(0);
    const payload = JSON.parse(json.stdout);
    const logo = payload.nodes.find(
      (n: { id: string }) => n.id === "asset.logo",
    );
    expect(logo.materials).toBe(2);
    expect(payload).not.toHaveProperty("checks");
  });

  it("fails validate when a node uses the removed `relates` key", async () => {
    await writeFile(
      join(dir, "manifest.yml"),
      "schema: ghost.fingerprint-package/v1\nid: solo\n",
    );
    await writeFile(
      join(dir, "n.md"),
      "---\nrelates:\n  - to: nope/missing\n---\n\nBody.\n",
    );

    const validate = await runCli(["validate", "."], dir);
    expect(validate.code).toBe(1);
    expect(validate.stdout).toContain("relates");
  });

  it("gather carries each node's kind in the menu", async () => {
    await writeGatherPackage(dir);

    const result = await runCli(
      ["gather", "--package", ".ghost", "--format", "json"],
      dir,
    );

    expect(result.code).toBe(0);
    const payload = JSON.parse(result.stdout);
    const byId = Object.fromEntries(
      payload.nodes.map((n: { id: string; kind?: string }) => [n.id, n.kind]),
    );
    // Present as a key for every node (undefined when uncategorized).
    expect(Object.keys(byId)).toContain("email/marketing/index");
  });

  it("review matches diff files to node materials and offers checks", async () => {
    await runCli(["init", "--with", "checks"], dir);
    await writeFile(
      join(dir, ".ghost", "asset.logo.md"),
      "---\ndescription: Logo.\nmaterials:\n  - brand/logo*.svg\n---\n\nLogo prose.\n",
    );
    await writeFile(
      join(dir, ".ghost", "haunts", "checks", "logo-clearspace.md"),
      "---\nname: logo-clearspace\ndescription: Logo clearspace holds.\nseverity: medium\nreferences:\n  - asset.logo\n---\n\nGrade logo clearspace.\n",
    );
    const diff = [
      "diff --git a/brand/logo.svg b/brand/logo.svg",
      "--- a/brand/logo.svg",
      "+++ b/brand/logo.svg",
      "@@ -1 +1 @@",
      "-old",
      "+new",
    ].join("\n");

    const result = await runCli(
      ["review", "--diff=-", "--format", "json"],
      dir,
      {
        stdin: diff,
      },
    );

    expect(result.code).toBe(0);
    const packet = JSON.parse(result.stdout);
    expect(packet.materialNodes[0]).toMatchObject({
      id: "asset.logo",
      files: ["brand/logo.svg"],
      matchedMaterials: ["brand/logo*.svg"],
    });
    expect(packet.checks[0]).toMatchObject({
      id: "logo-clearspace",
      offered: "matched",
    });
  });

  it("haunt add scaffolds the checks haunt and list reports it", async () => {
    await runCli(["init"], dir);

    const add = await runCli(
      ["haunt", "add", "checks", "--format", "json"],
      dir,
    );
    expect(add.code).toBe(0);
    const added = JSON.parse(add.stdout);
    expect(added.added).toBe("checks");
    expect(added.written).toContain("haunt.yml");
    expect(added.written).toContain("example.md.example");
    await expect(
      readFile(join(dir, ".ghost", "haunts", "checks", "haunt.yml"), "utf-8"),
    ).resolves.toContain("schema: ghost.haunt/v1");

    const list = await runCli(["haunt", "list"], dir);
    expect(list.code).toBe(0);
    expect(list.stdout).toContain("Haunting this fingerprint: checks");

    // Adding the same haunt twice is a usage error.
    const again = await runCli(["haunt", "add", "checks"], dir);
    expect(again.code).toBe(2);

    // The scaffold validates cleanly (example.md.example is inert).
    const validate = await runCli(["validate"], dir);
    expect(validate.code).toBe(0);

    const remove = await runCli(["haunt", "remove", "checks"], dir);
    expect(remove.code).toBe(0);
    const listAfter = await runCli(["haunt", "list"], dir);
    expect(listAfter.stdout).toContain("No haunts installed.");
  });

  it("haunt add rejects unknown haunt ids", async () => {
    await runCli(["init"], dir);
    const result = await runCli(["haunt", "add", "spectre"], dir);
    expect(result.code).toBe(2);
    expect(result.stderr).toContain("Unknown haunt 'spectre'");
  });

  it("review without the checks haunt exits with an add hint", async () => {
    await runCli(["init"], dir);
    const result = await runCli(["review", "--diff=-"], dir, { stdin: "" });
    expect(result.code).toBe(2);
    expect(result.stderr).toContain("ghost haunt add checks");
  });
});

async function writeGatherPackage(dir: string): Promise<void> {
  const ghost = join(dir, ".ghost");
  await mkdir(join(ghost, "email", "marketing"), { recursive: true });
  await mkdir(join(ghost, "checkout"), { recursive: true });
  await writeFile(
    join(ghost, "manifest.yml"),
    "schema: ghost.fingerprint-package/v1\nid: gather-demo\n",
  );
  // Folders are a browsing convenience only; ids are paths minus .md.
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
