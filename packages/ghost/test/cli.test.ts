import { mkdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { gunzipSync } from "node:zlib";
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
      "export",
      "checks init",
      "skill install",
    ]) {
      expect(result.stdout).toContain(command);
    }
    expect(result.stdout).toContain("ghost --help --all");
    // Removed in the flat-corpus cleanup.
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
      "export",
      "checks <action>",
      "manifest",
      "skill <action>",
    ]) {
      expect(result.stdout).toContain(command);
    }
    // Removed in the flat-corpus cleanup.
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
    expect(names).toContain("export");
    expect(names).toContain("checks");
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

  const SKELETON_FILES = [
    "manifest.yml",
    ".gitignore",
    "glossary.md",
    "index.md",
    "anti-goal.median.md",
    "grammar.hierarchy.md",
    "grammar.rhythm.md",
    "grammar.surfaces.md",
    "grammar.motion.md",
    "grammar.color-roles.md",
    "grammar.conversation.md",
    "signature.shape.md",
    "signature.palette.md",
    "signature.type.md",
    "signature.temperature.md",
  ];

  async function expectSkeletonPackage(written: string[]) {
    // Exact file inventory: no anti-goal.tells, no register.*, no materials/.
    expect([...written].sort()).toEqual([...SKELETON_FILES].sort());
    expect(written).not.toContain("anti-goal.tells.md");
    expect(written.some((f: string) => f.startsWith("register."))).toBe(false);
    expect(written.some((f: string) => f.startsWith("materials/"))).toBe(false);
    // Core init is fingerprint-only: checks are opt-in via --with / checks init.
    expect(written).not.toContain("checks/example.md.example");

    await expect(
      readFile(join(dir, ".ghost", "manifest.yml"), "utf-8"),
    ).resolves.toContain("schema: ghost.fingerprint-package/v1");

    // The scaffolded package validates with zero errors AND zero warnings.
    const validate = await runCli(["validate", "--format", "json"], dir);
    expect(validate.code).toBe(0);
    const report = JSON.parse(validate.stdout);
    expect(report.errors).toBe(0);
    expect(report.warnings).toBe(0);

    // The gather menu carries every node with its kind.
    const gather = await runCli(["gather", "--format", "json"], dir);
    expect(gather.code).toBe(0);
    const menu = JSON.parse(gather.stdout);
    const byId = new Map(
      menu.nodes.map((node: { id: string; kind?: string }) => [
        node.id,
        node.kind,
      ]),
    );
    expect(byId.get("index")).toBeUndefined;
    expect(byId.has("index")).toBe(true);
    expect(byId.get("anti-goal.median")).toBe("anti-goal");
    for (const slug of [
      "hierarchy",
      "rhythm",
      "surfaces",
      "motion",
      "color-roles",
      "conversation",
    ]) {
      expect(byId.get(`grammar.${slug}`)).toBe("grammar");
    }
    for (const slug of ["shape", "palette", "type", "temperature"]) {
      expect(byId.get(`signature.${slug}`)).toBe("signature");
    }

    // The median floor survives intact: prune header + rule anchors.
    const median = await runCli(["pull", "anti-goal.median"], dir);
    expect(median.code).toBe(0);
    expect(median.stdout).toContain(
      "This is the model's median, not your brand.",
    );
    expect(median.stdout).toContain("<!-- rule:median-side-stripe -->");

    // The dials ship unanswered and forbid freehanding.
    const shape = await runCli(["pull", "signature.shape"], dir);
    expect(shape.code).toBe(0);
    expect(shape.stdout).toContain("This dial is unanswered");
    expect(shape.stdout).toContain("freehand");

    // No Vessel strings anywhere in the scaffolded package.
    const forbidden = [
      "Vessel",
      "HK Grotesk",
      "999px",
      "Morrow",
      "amber",
      "periwinkle",
      "clay",
      "orchid",
      "sage",
    ];
    for (const file of written) {
      const content = await readFile(join(dir, ".ghost", file), "utf-8");
      for (const needle of forbidden) {
        expect(content, `${file} must not contain "${needle}"`).not.toMatch(
          new RegExp(`\\b${needle}\\b`, "i"),
        );
      }
    }
  }

  it("initializes the default skeleton fingerprint package", async () => {
    const init = await runCli(["init", "--format", "json"], dir);

    expect(init.code).toBe(0);
    const initOutput = JSON.parse(init.stdout);
    expect(Object.keys(initOutput).sort()).toEqual(["dir", "written"]);
    await expectSkeletonPackage(initOutput.written);
  });

  it("initializes the minimal fingerprint package", async () => {
    const init = await runCli(
      ["init", "--template", "minimal", "--format", "json"],
      dir,
    );

    expect(init.code).toBe(0);
    const initOutput = JSON.parse(init.stdout);
    expect(initOutput.written).toContain("manifest.yml");
    expect(initOutput.written).toContain("glossary.md");
    expect(initOutput.written).toContain("index.md");
    expect(initOutput.written).not.toContain("principle.stance.md");
    expect(initOutput.written).not.toContain("decision.tradeoff.md");

    const validate = await runCli(["validate"], dir);
    expect(validate.code).toBe(0);
  });

  it("keeps default and steering as aliases for the skeleton template", async () => {
    for (const name of ["default", "steering"]) {
      await rm(join(dir, ".ghost"), { recursive: true, force: true });
      const init = await runCli(
        ["init", "--template", name, "--format", "json"],
        dir,
      );

      expect(init.code).toBe(0);
      const initOutput = JSON.parse(init.stdout);
      expect([...initOutput.written].sort()).toEqual(
        [...SKELETON_FILES].sort(),
      );

      const validate = await runCli(["validate"], dir);
      expect(validate.code).toBe(0);
    }
  });

  it("initializes the composition starter template", async () => {
    const init = await runCli(
      ["init", "--template", "composition", "--format", "json"],
      dir,
    );

    expect(init.code).toBe(0);
    const initOutput = JSON.parse(init.stdout);
    expect(initOutput.written).toContain("manifest.yml");
    expect(initOutput.written).toContain("glossary.md");
    expect(initOutput.written).toContain("index.md");
    expect(initOutput.written).toContain("principle.composition.md");
    expect(initOutput.written).toContain("pattern.status-with-next-step.md");

    // The scaffolded package is valid as written.
    const validate = await runCli(["validate"], dir);
    expect(validate.code).toBe(0);

    // The ladder nodes surface in the gather menu with their kinds.
    const gather = await runCli(["gather", "--format", "json"], dir);
    expect(gather.code).toBe(0);
    const menu = JSON.parse(gather.stdout);
    const ids = menu.nodes.map((node: { id: string }) => node.id);
    expect(ids).toContain("principle.composition");
    expect(ids).toContain("pattern.status-with-next-step");
    const pattern = menu.nodes.find(
      (node: { id: string }) => node.id === "pattern.status-with-next-step",
    );
    expect(pattern.kind).toBe("pattern");

    // The pattern body carries the bound/open/refines convention.
    const pull = await runCli(["pull", "pattern.status-with-next-step"], dir);
    expect(pull.code).toBe(0);
    expect(pull.stdout).toContain("Bound (decided");
    expect(pull.stdout).toContain("Open (your call");
    expect(pull.stdout).toContain("principle.composition");
  });

  it("initializes the skeleton starter template by name", async () => {
    const init = await runCli(
      ["init", "--template", "skeleton", "--format", "json"],
      dir,
    );

    expect(init.code).toBe(0);
    const initOutput = JSON.parse(init.stdout);
    await expectSkeletonPackage(initOutput.written);
  });

  it("rejects an unknown init template with a usage error", async () => {
    const result = await runCli(
      ["init", "--template", "nope", "--format", "json"],
      dir,
      { allowNoExit: true },
    );

    expect(result.code).toBe(2);
    expect(result.stderr).toContain("Unknown init template 'nope'");
    expect(result.stderr).toContain("minimal");
    expect(result.stderr).toContain("composition");
    expect(result.stderr).toContain("skeleton");
  });

  it("installs the vessel-light body: full corpus, materials, checks", async () => {
    const init = await runCli(
      ["init", "--body", "vessel-light", "--format", "json"],
      dir,
    );
    expect(init.code).toBe(0);
    const { written } = JSON.parse(init.stdout) as { written: string[] };

    // The body is the inhabited package: corpus + tells + registers +
    // materials tree + its own checks. No .events tape.
    expect(written).toContain("manifest.yml");
    expect(written).toContain("anti-goal.median.md");
    expect(written).toContain("anti-goal.tells.md");
    expect(written).toContain("register.email.md");
    expect(written).toContain("signature.shape.md");
    expect(written).toContain("materials/tokens.css");
    expect(written).toContain("materials/fonts/HKGrotesk-Regular.woff2");
    expect(written).toContain("materials/ref/composition.form.html");
    expect(written).toContain("checks/median-tells.md");
    expect(written).toContain("checks/values.md");
    expect(written.some((p) => p.includes(".events"))).toBe(false);

    // Manifest id stays vessel-light: renaming it is step one of adapting
    // the starter — an explicit human act, never pre-executed by init.
    const manifest = await readFile(
      join(dir, ".ghost", "manifest.yml"),
      "utf-8",
    );
    expect(manifest).toContain("id: vessel-light");

    // Fonts survive the packed payload byte-identically.
    const [installed, source] = await Promise.all([
      readFile(
        join(dir, ".ghost", "materials", "fonts", "HKGrotesk-Regular.woff2"),
      ),
      readFile(
        new URL(
          "../../vessel-light/.ghost/materials/fonts/HKGrotesk-Regular.woff2",
          import.meta.url,
        ),
      ),
    ]);
    expect(installed.equals(source)).toBe(true);

    // The installed body validates clean, checks included.
    const validate = await runCli(["validate", "--format", "json"], dir);
    expect(validate.code).toBe(0);
    const report = JSON.parse(validate.stdout);
    expect(report.errors).toBe(0);
    expect(report.warnings).toBe(0);
  });

  it("rejects unknown bodies and contradictory body flags", async () => {
    const unknown = await runCli(["init", "--body", "nope"], dir, {
      allowNoExit: true,
    });
    expect(unknown.code).toBe(2);
    expect(unknown.stderr).toContain("Unknown init body 'nope'");
    expect(unknown.stderr).toContain("vessel-light");

    const both = await runCli(
      ["init", "--body", "vessel-light", "--template", "minimal"],
      dir,
      { allowNoExit: true },
    );
    expect(both.code).toBe(2);
    expect(both.stderr).toContain("mutually exclusive");

    const withChecks = await runCli(
      ["init", "--body", "vessel-light", "--with", "checks"],
      dir,
      { allowNoExit: true },
    );
    expect(withChecks.code).toBe(2);
    expect(withChecks.stderr).toContain("already includes its own checks/");
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
    await runCli(["init", "--template", "minimal"], dir);
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
    ).resolves.toContain("skeleton fingerprint");
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
      runCli(["init", "--reference", "packages/vessel-react/.ghost"], dir),
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

  it("gather surfaces glossary kind purposes as a menu legend", async () => {
    await runCli(["init"], dir);

    // JSON carries the glossary's declared kinds with their prose purposes.
    const gather = await runCli(["gather", "--format", "json"], dir);
    expect(gather.code).toBe(0);
    const menu = JSON.parse(gather.stdout);
    const grammar = menu.kinds.find(
      (k: { name: string }) => k.name === "grammar",
    );
    expect(grammar.purpose).toContain("decision logic");

    // Markdown renders the same legend above the node list.
    const markdown = await runCli(["gather"], dir);
    expect(markdown.stdout).toContain("Kinds:");
    expect(markdown.stdout).toContain(
      "- **grammar** — The brand's decision logic",
    );

    // A missing glossary degrades to no legend, not an error.
    await rm(join(dir, ".ghost", "glossary.md"));
    const bare = await runCli(["gather", "--format", "json"], dir);
    expect(bare.code).toBe(0);
    expect(JSON.parse(bare.stdout).kinds).toBeUndefined();
  });

  it("runs validate from the unified cli", async () => {
    await writeCheckPackage(dir);
    const validate = await runCli(["validate"], dir);

    expect(validate.code).toBe(0);
    expect(validate.stdout).toContain("0 error");
  });

  it("gather excludes wild nodes by default and includes marked wild nodes with --wild", async () => {
    await runCli(["init", "--template", "minimal"], dir);
    await writeFile(
      join(dir, ".ghost", "glossary.md"),
      `---
kinds:
  - name: principle
  - name: provocation
    posture: wild
---

# principle

Durable stance.

# provocation

a deliberate provocation past the fingerprint — surfaced only on request
`,
    );
    await writeFile(
      join(dir, ".ghost", "provocation.noise.md"),
      "---\ndescription: Break the usual rhythm.\n---\n\nInterrupt the grid.\n",
    );
    await writeFile(
      join(dir, ".ghost", "principle.trust.md"),
      "---\ndescription: Trust.\n---\n\nReduce felt risk.\n",
    );

    const defaultJson = await runCli(
      ["gather", "hero", "--format", "json"],
      dir,
    );
    expect(defaultJson.code).toBe(0);
    const defaultPayload = JSON.parse(defaultJson.stdout);
    expect(
      defaultPayload.nodes.map((node: { id: string }) => node.id),
    ).not.toContain("provocation.noise");
    expect(defaultPayload.wildAvailable).toBe(1);

    const defaultMarkdown = await runCli(["gather", "hero"], dir);
    expect(defaultMarkdown.stdout).not.toContain("`provocation.noise`");
    expect(defaultMarkdown.stdout).toContain(
      "1 wild node available via `--wild`",
    );

    const wildJson = await runCli(
      ["gather", "hero", "--wild", "--format", "json"],
      dir,
    );
    expect(wildJson.code).toBe(0);
    const wildPayload = JSON.parse(wildJson.stdout);
    const wildNode = wildPayload.nodes.find(
      (node: { id: string }) => node.id === "provocation.noise",
    );
    expect(wildNode).toMatchObject({
      kind: "provocation",
      wild: true,
    });
    expect(wildPayload.wildAvailable).toBeUndefined();

    const wildMarkdown = await runCli(["gather", "hero", "--wild"], dir);
    expect(wildMarkdown.stdout).toContain(
      "`provocation.noise` _(provocation)_ _(wild)",
    );
    expect(wildMarkdown.stdout).toContain(
      "Wild nodes are marked `(wild)`: they push past the fingerprint",
    );

    const events = (await readFile(join(dir, ".ghost", ".events"), "utf-8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(events[0]).toMatchObject({
      event: "gather",
      wild: false,
      wildIds: [],
    });
    expect(events[2]).toMatchObject({
      event: "gather",
      wild: true,
      wildIds: ["provocation.noise"],
    });
  });

  it("pull works for wild nodes and pulse reports wild usage", async () => {
    await runCli(["init", "--template", "minimal"], dir);
    await writeFile(
      join(dir, ".ghost", "glossary.md"),
      `---
kinds:
  - name: principle
  - name: provocation
    posture: wild
---

# principle

Durable stance.

# provocation

a deliberate provocation past the fingerprint — surfaced only on request
`,
    );
    await writeFile(
      join(dir, ".ghost", "provocation.noise.md"),
      "---\ndescription: Break the usual rhythm.\n---\n\nInterrupt the grid.\n",
    );

    await runCli(["gather", "hero", "--wild"], dir);
    const pull = await runCli(["pull", "provocation.noise"], dir);
    expect(pull.code).toBe(0);
    expect(pull.stdout).toContain("Interrupt the grid.");
    expect(pull.stdout).toContain("_(wild)_");

    const events = (await readFile(join(dir, ".ghost", ".events"), "utf-8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(events.at(-1)).toMatchObject({
      event: "pull",
      ids: ["provocation.noise"],
      wildIds: ["provocation.noise"],
    });

    const pulse = await runCli(["pulse", "--format", "json"], dir);
    expect(pulse.code).toBe(0);
    expect(JSON.parse(pulse.stdout).wild).toEqual({ exposures: 1, pulls: 1 });

    const md = await runCli(["pulse"], dir);
    expect(md.stdout).toContain("## Wild usage");
    expect(md.stdout).toContain("- Wild exposures: 1");
    expect(md.stdout).toContain("- Wild pulls: 1");
  });

  it("announces the events tape once, on first write, on stderr only", async () => {
    await runCli(["init"], dir);

    // First event-writing command creates the tape and prints the notice.
    const first = await runCli(["gather", "checkout"], dir);
    expect(first.code).toBe(0);
    expect(first.stderr).toContain(".ghost/.events");
    expect(first.stderr).toContain("gitignored");
    expect(first.stderr).toContain("never leaves your machine");
    // Stdout stays clean for piping.
    expect(first.stdout).not.toContain("never leaves your machine");

    // Every subsequent write is silent.
    const second = await runCli(["gather", "checkout"], dir);
    expect(second.code).toBe(0);
    expect(second.stderr).not.toContain(".ghost/.events");

    const pull = await runCli(["pull", "index"], dir);
    expect(pull.code).toBe(0);
    expect(pull.stderr).not.toContain(".ghost/.events");
  });

  it("gather reports concrete coverage and pull uses steering order with given-order escape hatch", async () => {
    await runCli(["init", "--template", "minimal"], dir);
    await writeFile(
      join(dir, ".ghost", "glossary.md"),
      "---\nkinds:\n  - name: anti-goal\n    posture: guard\n  - name: asset\n  - name: principle\n---\n\n# anti-goal\n\nReview-critical replacement.\n\n# asset\n\nConcrete material.\n\n# principle\n\nRule.\n",
    );
    await writeFile(
      join(dir, ".ghost", "asset.tokens.md"),
      "---\ndescription: Tokens.\nmaterials:\n  - missing.css\n---\n\nUse exact tokens.\n",
    );
    await writeFile(
      join(dir, ".ghost", "principle.rule.md"),
      "---\ndescription: Rule.\n---\n\nPlain rule.\n",
    );
    await writeFile(
      join(dir, ".ghost", "anti-goal.generic.md"),
      "---\ndescription: Generic replacement.\n---\n\nNot vague; instead exact.\n",
    );

    const gather = await runCli(["gather", "--format", "json"], dir);
    expect(gather.code).toBe(0);
    expect(JSON.parse(gather.stdout).coverage).toEqual({
      nodes: 4,
      concrete: 1,
      guards: 1,
    });
    const markdown = await runCli(["gather"], dir);
    expect(markdown.stdout).toContain(
      "4 nodes · 1 carry concrete material · 1 guards",
    );

    const steering = await runCli(
      ["pull", "anti-goal.generic", "principle.rule", "asset.tokens"],
      dir,
    );
    expect(steering.code).toBe(0);
    expect(steering.stdout.indexOf("`asset.tokens`")).toBeLessThan(
      steering.stdout.indexOf("`principle.rule`"),
    );
    expect(steering.stdout.indexOf("`principle.rule`")).toBeLessThan(
      steering.stdout.indexOf("`anti-goal.generic`"),
    );

    const given = await runCli(
      [
        "pull",
        "anti-goal.generic",
        "principle.rule",
        "asset.tokens",
        "--order",
        "given",
      ],
      dir,
    );
    expect(given.stdout.indexOf("`anti-goal.generic`")).toBeLessThan(
      given.stdout.indexOf("`principle.rule`"),
    );
  });

  it("pull extracts Skeletons last and validate warns on malformed Skeleton sections", async () => {
    await runCli(["init", "--template", "minimal"], dir);
    await writeFile(
      join(dir, ".ghost", "pattern.card.md"),
      "---\ndescription: Card pattern.\n---\n\nPattern prose.\n\n## Skeleton\n\n```tsx\n<section>{children}</section>\n```\n\nAfter skeleton should be stripped.\n",
    );
    await writeFile(
      join(dir, ".ghost", "pattern.bad.md"),
      "---\ndescription: Bad skeleton.\n---\n\n## Skeleton\n\nNo fence here.\n",
    );

    const pull = await runCli(["pull", "pattern.card"], dir);
    expect(pull.code).toBe(0);
    expect(pull.stdout).toContain("Pattern prose.");
    expect(pull.stdout).not.toContain("After skeleton should be stripped.");
    expect(pull.stdout).toContain(
      "# Skeletons — begin the artifact from this structure",
    );
    expect(pull.stdout.indexOf("# `pattern.card`")).toBeLessThan(
      pull.stdout.indexOf("# Skeletons"),
    );
    expect(pull.stdout).toContain("<section>{children}</section>");

    const validate = await runCli(["validate"], dir);
    expect(validate.code).toBe(0);
    expect(validate.stdout).toContain("skeleton-fence-count");
  });

  it("pull emits binary materials as inspect-pointers in markdown and JSON", async () => {
    await runCli(["init", "--template", "minimal"], dir);
    await mkdir(join(dir, "brand"), { recursive: true });
    await writeFile(join(dir, "brand", "mark.png"), Buffer.from([0, 1, 2]));
    await writeFile(
      join(dir, ".ghost", "asset.logo.md"),
      "---\ndescription: Logo.\nmaterials:\n  - brand/mark.png\n---\n\nInspect the blessed mark.\n",
    );

    const md = await runCli(["pull", "asset.logo"], dir);
    expect(md.stdout).toContain(
      "- inspect: brand/mark.png — view this image before generating",
    );

    const json = await runCli(["pull", "asset.logo", "--format", "json"], dir);
    expect(JSON.parse(json.stdout).nodes[0].materials[0]).toMatchObject({
      locator: "brand/mark.png",
      tier: "referenced",
      omitted: true,
      reason: "binary inspect-pointer",
      inspect: "brand/mark.png",
    });
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

    // --no-events skips the events tape.
    await runCli(["pull", "voice", "--no-events"], dir);
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

  it("pull inlines material files and emits inspect-pointers for binary materials, oversize files, and URL locators", async () => {
    await runCli(["init", "--template", "minimal"], dir);
    await mkdir(join(dir, ".ghost", "materials"), { recursive: true });
    await mkdir(join(dir, "brand"), { recursive: true });
    await writeFile(
      join(dir, ".ghost", "materials", "tokens.css"),
      ":root { --brand: #111; }\n",
    );
    await writeFile(join(dir, "brand", "voice.txt"), "Use plain words.\n");
    await writeFile(join(dir, "brand", "mark.bin"), Buffer.from([0, 1, 2]));
    await writeFile(join(dir, "brand", "large.txt"), "x".repeat(8 * 1024 + 1));
    await writeFile(
      join(dir, ".ghost", "asset.materials.md"),
      "---\ndescription: Materials.\nmaterials:\n  - materials/tokens.css\n  - brand/voice.txt\n  - brand/mark.bin\n  - brand/large.txt\n  - https://example.com/brand-kit\n---\n\nRead these materials.\n",
    );

    const md = await runCli(["pull", "asset.materials"], dir);

    expect(md.code).toBe(0);
    expect(md.stdout).toContain("Read these materials.");
    expect(md.stdout).toContain("```.ghost/materials/tokens.css");
    expect(md.stdout).toContain(":root { --brand: #111; }");
    expect(md.stdout).toContain("```brand/voice.txt");
    expect(md.stdout).toContain("Use plain words.");
    expect(md.stdout).toContain(
      "- inspect: brand/mark.bin — view this image before generating",
    );
    expect(md.stdout).toContain(
      "- brand/large.txt — exceeds 8 KB inline limit",
    );
    expect(md.stdout).toContain(
      "- https://example.com/brand-kit — HTTPS URL; fetch it only if the task requires it",
    );

    const events = (await readFile(join(dir, ".ghost", ".events"), "utf-8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(events.at(-1)).toMatchObject({
      event: "pull",
      ids: ["asset.materials"],
      inlinedMaterials: 2,
      omittedMaterials: 3,
    });
  });

  it("pull supports locator-only output with --no-materials", async () => {
    await runCli(["init", "--template", "minimal"], dir);
    await mkdir(join(dir, ".ghost", "materials"), { recursive: true });
    await writeFile(
      join(dir, ".ghost", "materials", "tokens.css"),
      ":root{}\n",
    );
    await writeFile(
      join(dir, ".ghost", "asset.tokens.md"),
      "---\ndescription: Tokens.\nmaterials:\n  - materials/tokens.css\n---\n\nToken prose.\n",
    );

    const md = await runCli(["pull", "asset.tokens", "--no-materials"], dir);

    expect(md.code).toBe(0);
    expect(md.stdout).toContain("Materials:");
    expect(md.stdout).toContain("- materials/tokens.css");
    expect(md.stdout).not.toContain("```.ghost/materials/tokens.css");

    const json = await runCli(
      ["pull", "asset.tokens", "--no-materials", "--format", "json"],
      dir,
    );
    expect(json.code).toBe(0);
    expect(JSON.parse(json.stdout).nodes[0].materials).toEqual([
      "materials/tokens.css",
    ]);
  });

  it("pull emits transported material objects in JSON", async () => {
    await runCli(["init", "--template", "minimal"], dir);
    await mkdir(join(dir, ".ghost", "materials"), { recursive: true });
    await mkdir(join(dir, "brand"), { recursive: true });
    await writeFile(
      join(dir, ".ghost", "materials", "tokens.css"),
      ":root{}\n",
    );
    await writeFile(join(dir, "brand", "voice.txt"), "Plain.\n");
    await writeFile(
      join(dir, ".ghost", "asset.tokens.md"),
      "---\ndescription: Tokens.\nmaterials:\n  - materials/tokens.css\n  - brand/voice.txt\n  - https://example.com/tokens\n---\n\nToken prose.\n",
    );

    const json = await runCli(
      ["pull", "asset.tokens", "--format", "json"],
      dir,
    );

    expect(json.code).toBe(0);
    const node = JSON.parse(json.stdout).nodes[0];
    expect(node.materials).toEqual([
      {
        locator: "materials/tokens.css",
        tier: "bundled",
        inlined: ":root{}\n",
      },
      {
        locator: "brand/voice.txt",
        tier: "referenced",
        inlined: "Plain.\n",
      },
      {
        locator: "https://example.com/tokens",
        tier: "url",
        omitted: true,
        reason: "HTTPS URL; fetch it only if the task requires it",
      },
    ]);
  });

  it("pull expands globs with a cap and notes elision beyond it", async () => {
    await runCli(["init", "--template", "minimal"], dir);
    await mkdir(join(dir, "brand", "samples"), { recursive: true });
    for (let i = 0; i < 13; i++) {
      await writeFile(
        join(dir, "brand", "samples", `${String(i).padStart(2, "0")}.txt`),
        `sample ${i}\n`,
      );
    }
    await writeFile(
      join(dir, ".ghost", "asset.samples.md"),
      "---\ndescription: Samples.\nmaterials:\n  - brand/samples/*.txt\n---\n\nSample prose.\n",
    );

    const json = await runCli(
      ["pull", "asset.samples", "--format", "json"],
      dir,
    );

    expect(json.code).toBe(0);
    const materials = JSON.parse(json.stdout).nodes[0].materials;
    expect(
      materials.filter((m: { inlined?: string }) => m.inlined).length,
    ).toBe(12);
    expect(materials).toContainEqual(
      expect.objectContaining({
        locator: "brand/samples/*.txt",
        tier: "referenced",
        omitted: true,
        reason: "glob matched more than 12 files; omitted the rest",
      }),
    );
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
    await runCli(["init", "--template", "minimal"], dir);
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
      wild: { exposures: 0, pulls: 0 },
    });
    const trust = report.nodes.find(
      (node: { id: string }) => node.id === "principle.trust",
    );
    expect(trust).toMatchObject({
      exposures: 2,
      pulls: 1,
      hitRate: 0.5,
    });
    expect(report.coldNodes).toContain("voice");
    expect(report.misses[0]).toMatchObject({
      requested: "principle.trst",
      count: 1,
      suggested: ["principle.trust"],
    });
    const principleKind = report.kinds.find(
      (kind: { kind: string }) => kind.kind === "principle",
    );
    expect(principleKind).toMatchObject({
      exposures: 2,
      pulls: 1,
      hitRate: 0.5,
      coldNodes: [],
    });
    const noKind = report.kinds.find(
      (kind: { kind: string }) => kind.kind === "(no kind)",
    );
    expect(noKind).toMatchObject({
      exposures: 4,
      pulls: 0,
      hitRate: 0,
      coldNodes: ["index", "voice"],
    });

    const md = await runCli(["pulse"], dir);
    expect(md.stdout).toContain("# Ghost Pulse");
    expect(md.stdout).toContain("## Kind hit rates");
    expect(md.stdout).toContain("## Wild usage");
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
      "references/blocks.md",
      "references/brief.md",
      "references/recall.md",
      "references/wild.md",
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
    const checksDir = join(dir, ".ghost", "checks");
    await mkdir(checksDir, { recursive: true });
    await writeFile(
      join(dir, ".ghost", "asset.logo.md"),
      "---\ndescription: Logo.\nmaterials:\n  - brand/logo.svg\n  - https://example.com/logo\n---\n\nLogo prose.\n",
    );
    await writeFile(
      join(checksDir, "secret-check.md"),
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
    // Present as a key for every node (undefined when no kind is present).
    expect(Object.keys(byId)).toContain("email/marketing/index");
  });

  it("review matches diff files to node materials and offers checks", async () => {
    await runCli(["init", "--with", "checks"], dir);
    await writeFile(
      join(dir, ".ghost", "asset.logo.md"),
      "---\ndescription: Logo.\nmaterials:\n  - brand/logo*.svg\n---\n\nLogo prose.\n",
    );
    await writeFile(
      join(dir, ".ghost", "checks", "logo-clearspace.md"),
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

  it("review runs check probes as evidence and supports --no-probes", async () => {
    await runCli(["init", "--with", "checks"], dir);
    await writeFile(
      join(dir, ".ghost", "asset.logo.md"),
      "---\ndescription: Logo.\nmaterials:\n  - brand/logo.svg\n---\n\nLogo prose.\n",
    );
    await writeFile(
      join(dir, ".ghost", "checks", "logo-probe.md"),
      "---\nname: logo-probe\ndescription: Probe logo evidence.\nseverity: low\nreferences:\n  - asset.logo\nprobe: node -e \"console.log('probe evidence')\"\n---\n\nUse probe evidence, then judge.\n",
    );
    const diff = [
      "diff --git a/brand/logo.svg b/brand/logo.svg",
      "--- a/brand/logo.svg",
      "+++ b/brand/logo.svg",
      "@@ -1 +1 @@",
      "-old",
      "+new",
    ].join("\n");

    const probed = await runCli(
      ["review", "--diff=-", "--format", "json"],
      dir,
      {
        stdin: diff,
      },
    );
    expect(probed.code).toBe(0);
    expect(JSON.parse(probed.stdout).checks[0].probe).toMatchObject({
      exitCode: 0,
      stdout: "probe evidence\n",
    });

    const skipped = await runCli(
      ["review", "--diff=-", "--format", "json", "--no-probes"],
      dir,
      { stdin: diff },
    );
    expect(JSON.parse(skipped.stdout).checks[0].probe).toBeUndefined();
  });

  it("review auto-offers matched guard nodes without check references", async () => {
    await runCli(["init", "--with", "checks"], dir);
    await writeFile(
      join(dir, ".ghost", "glossary.md"),
      "---\nkinds:\n  - name: anti-goal\n    posture: guard\n---\n\n# anti-goal\n\nReview-critical replacements.\n",
    );
    await writeFile(
      join(dir, ".ghost", "anti-goal.generic-logo.md"),
      "---\ndescription: Replace generic marks.\nmaterials:\n  - brand/logo.svg\n---\n\nNot a stock spark; instead use the wordmark and measured clearspace.\n",
    );
    await writeFile(
      join(dir, ".ghost", "checks", "unrelated.md"),
      "---\nname: unrelated\ndescription: Always review unrelated posture.\nseverity: low\nreferences:\n  - missing.future\n---\n\nReview unrelated things.\n",
    );
    const diff = [
      "diff --git a/brand/logo.svg b/brand/logo.svg",
      "--- a/brand/logo.svg",
      "+++ b/brand/logo.svg",
      "@@ -1 +1 @@",
      "-old",
      "+new",
    ].join("\n");

    const result = await runCli(["review", "--diff=-"], dir, { stdin: diff });

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("## Matched guard nodes — review-critical");
    expect(result.stdout).toContain(
      "### `anti-goal.generic-logo` _(anti-goal)_",
    );
  });

  it("export writes a portable tarball with export metadata and private events excluded", async () => {
    await runCli(["init", "--with", "checks"], dir);
    await mkdir(join(dir, ".ghost", "materials"), { recursive: true });
    await writeFile(join(dir, ".ghost", ".events"), '{"event":"gather"}\n');
    await writeFile(
      join(dir, ".ghost", "materials", "tokens.css"),
      ":root{}\n",
    );
    await writeFile(
      join(dir, ".ghost", "asset.tokens.md"),
      "---\ndescription: Tokens.\nmaterials:\n  - materials/tokens.css\n  - https://example.com/tokens\n---\n\nToken prose.\n",
    );

    const out = join(dir, "brand.tgz");
    const result = await runCli(["export", "--out", out], dir);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Locator audit");
    expect(result.stdout).toContain("materials/tokens.css");
    expect(result.stdout).toContain("HTTPS URL");
    const archive = parseTarEntries(gunzipSync(await readFile(out)));
    expect(archive.has("asset.tokens.md")).toBe(true);
    expect(archive.has("export.yml")).toBe(true);
    expect(archive.has("glossary.md")).toBe(true);
    expect(archive.has("checks/example.md.example")).toBe(true);
    expect(archive.has("manifest.yml")).toBe(true);
    expect(archive.has("materials/tokens.css")).toBe(true);
    expect(archive.has(".events")).toBe(false);
    expect(
      parseYaml(archive.get("export.yml")?.toString("utf-8") ?? ""),
    ).toMatchObject({
      schema: "ghost.export/v1",
      id: "local",
      cli: expect.any(String),
      exported: expect.any(String),
    });
  });

  it("export --no-checks excludes checks from the archive", async () => {
    await runCli(["init", "--with", "checks"], dir);

    const out = join(dir, "brand-no-checks.tgz");
    const result = await runCli(["export", "--out", out, "--no-checks"], dir);

    expect(result.code).toBe(0);
    const archive = parseTarEntries(gunzipSync(await readFile(out)));
    expect([...archive.keys()].some((path) => path.startsWith("checks/"))).toBe(
      false,
    );
  });

  it("export audits bundled, URL, and referenced local material locators", async () => {
    await runCli(["init", "--template", "minimal"], dir);
    await mkdir(join(dir, ".ghost", "materials"), { recursive: true });
    await mkdir(join(dir, "brand"), { recursive: true });
    await writeFile(
      join(dir, ".ghost", "materials", "tokens.css"),
      ":root{}\n",
    );
    await writeFile(join(dir, "brand", "voice.txt"), "Plain.\n");
    await writeFile(
      join(dir, ".ghost", "asset.tokens.md"),
      "---\ndescription: Tokens.\nmaterials:\n  - materials/tokens.css\n  - brand/voice.txt\n  - https://example.com/tokens\n---\n\nToken prose.\n",
    );

    const result = await runCli(["export", "--format", "json"], dir);

    expect(result.code).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload).toMatchObject({
      kind: "export",
      id: "local",
      archive: expect.stringContaining("local-fingerprint.tgz"),
    });
    expect(payload.audit.travels).toEqual([
      {
        nodeId: "asset.tokens",
        locator: "materials/tokens.css",
        tier: "bundled",
      },
      {
        nodeId: "asset.tokens",
        locator: "https://example.com/tokens",
        tier: "url",
      },
    ]);
    expect(payload.audit.stranded).toEqual([
      { nodeId: "asset.tokens", locator: "brand/voice.txt" },
    ]);
  });

  it("export --strict exits 2 when referenced local material locators are stranded", async () => {
    await runCli(["init", "--template", "minimal"], dir);
    await writeFile(
      join(dir, ".ghost", "asset.voice.md"),
      "---\ndescription: Voice.\nmaterials:\n  - brand/voice.txt\n---\n\nVoice prose.\n",
    );

    const result = await runCli(["export", "--strict"], dir);

    expect(result.code).toBe(2);
    expect(result.stdout).toContain("brand/voice.txt");
    expect(result.stdout).toContain("Bundle it into `.ghost/materials/`");
  });

  it("commands work against an unpacked export directory outside a git repo", async () => {
    await runCli(["init", "--template", "minimal"], dir);
    await mkdir(join(dir, ".ghost", "materials"), { recursive: true });
    await writeFile(
      join(dir, ".ghost", "materials", "tokens.css"),
      ":root{}\n",
    );
    await writeFile(
      join(dir, ".ghost", "asset.tokens.md"),
      "---\ndescription: Tokens.\nmaterials:\n  - materials/tokens.css\n---\n\nToken prose.\n",
    );
    const out = join(dir, "portable.tgz");
    await runCli(["export", "--out", out], dir);

    const receiver = join(dir, "receiver");
    const unpacked = join(receiver, "fingerprint");
    await mkdir(unpacked, { recursive: true });
    const archive = parseTarEntries(gunzipSync(await readFile(out)));
    await writeEntries(unpacked, archive);

    const validate = await runCli(
      ["validate", "--package", unpacked],
      receiver,
    );
    expect(validate.code).toBe(0);
    const gather = await runCli(
      ["gather", "--package", unpacked, "--format", "json"],
      receiver,
    );
    expect(gather.code).toBe(0);
    expect(JSON.parse(gather.stdout).nodes).toContainEqual(
      expect.objectContaining({ id: "asset.tokens" }),
    );
    const pull = await runCli(
      ["pull", "asset.tokens", "--package", unpacked],
      receiver,
    );
    expect(pull.code).toBe(0);
    expect(pull.stdout).toContain(":root{}");
  });

  it("checks init scaffolds .ghost/checks/ with median tells and an example", async () => {
    await runCli(["init"], dir);

    const add = await runCli(["checks", "init", "--format", "json"], dir);
    expect(add.code).toBe(0);
    const added = JSON.parse(add.stdout);
    expect(added.written).toEqual(["median-tells.md", "example.md.example"]);
    await expect(
      readFile(join(dir, ".ghost", "checks", "example.md.example"), "utf-8"),
    ).resolves.toContain("references:");

    // The live median check pairs with the skeleton's anti-goal.median node.
    const median = await readFile(
      join(dir, ".ghost", "checks", "median-tells.md"),
      "utf-8",
    );
    expect(median).toContain("anti-goal.median");
    expect(median).toContain("rule:median-hover-lift");
    expect(median).toContain("prefers-reduced-motion");
    expect(median).toContain("delete both together");
    expect(median).not.toContain("Vessel");

    // Running init twice is a usage error.
    const again = await runCli(["checks", "init"], dir);
    expect(again.code).toBe(2);
    expect(again.stderr).toContain("already exists");

    // The scaffold validates cleanly on the default skeleton: median-tells
    // references resolve against anti-goal.median and the grammar nodes.
    const validate = await runCli(["validate", "--format", "json"], dir);
    expect(validate.code).toBe(0);
    const report = JSON.parse(validate.stdout);
    const unresolved = report.issues.filter(
      (f: { rule: string }) => f.rule === "check-reference-unresolved",
    );
    expect(unresolved).toEqual([]);
  });

  it("checks rejects unknown actions", async () => {
    await runCli(["init"], dir);
    const result = await runCli(["checks", "remove"], dir);
    expect(result.code).toBe(2);
    expect(result.stderr).toContain("supports `init`");
  });

  it("init --with rejects unknown capabilities", async () => {
    const result = await runCli(["init", "--with", "spectre"], dir);
    expect(result.code).toBe(2);
    expect(result.stderr).toContain("Unknown --with capability 'spectre'");
  });

  it("review without a checks directory exits with an init hint", async () => {
    await runCli(["init"], dir);
    const result = await runCli(["review", "--diff=-"], dir, { stdin: "" });
    expect(result.code).toBe(2);
    expect(result.stderr).toContain("ghost checks init");
  });

  it("validate flags the legacy haunts/ directory", async () => {
    await runCli(["init"], dir);
    await mkdir(join(dir, ".ghost", "haunts", "checks"), { recursive: true });
    const result = await runCli(["validate"], dir);
    expect(result.code).toBe(1);
    expect(result.stdout).toContain("no longer supported");
  });
});

function parseTarEntries(buffer: Buffer): Map<string, Buffer> {
  const entries = new Map<string, Buffer>();
  let offset = 0;
  while (offset + 512 <= buffer.byteLength) {
    const header = buffer.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    const name = readTarString(header, 0, 100);
    const prefix = readTarString(header, 345, 155);
    const sizeText = readTarString(header, 124, 12).replace(/\0/g, "").trim();
    const size = Number.parseInt(sizeText || "0", 8);
    const path = prefix ? `${prefix}/${name}` : name;
    const dataStart = offset + 512;
    entries.set(path, buffer.subarray(dataStart, dataStart + size));
    offset = dataStart + Math.ceil(size / 512) * 512;
  }
  return entries;
}

function readTarString(buffer: Buffer, offset: number, length: number): string {
  const slice = buffer.subarray(offset, offset + length);
  const end = slice.indexOf(0);
  return slice.subarray(0, end === -1 ? slice.length : end).toString("utf-8");
}

async function writeEntries(
  root: string,
  entries: Map<string, Buffer>,
): Promise<void> {
  for (const [path, data] of entries) {
    await mkdir(join(root, path, ".."), { recursive: true });
    await writeFile(join(root, path), data);
  }
}

async function writeGatherPackage(dir: string): Promise<void> {
  const ghost = join(dir, ".ghost");
  await mkdir(join(ghost, "email", "marketing"), { recursive: true });
  await mkdir(join(ghost, "checkout"), { recursive: true });
  await writeFile(
    join(ghost, "manifest.yml"),
    "schema: ghost.fingerprint-package/v1\nid: gather-demo\n",
  );
  // Directories are a browsing convenience only; ids are paths minus .md.
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
