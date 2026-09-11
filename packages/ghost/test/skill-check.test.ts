import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  realpath,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadSkillBundle } from "../src/ghost-core/index.js";
import { runCli } from "./cli-test-utils.js";

vi.mock("node:os", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:os")>();
  return { ...actual, homedir: vi.fn() };
});
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    readFile: vi.fn(actual.readFile),
    stat: vi.fn(actual.stat),
    readdir: vi.fn(actual.readdir),
  };
});

const BUNDLE = loadSkillBundle(resolve("packages/ghost/src/skill-bundle"));

describe("ghost skill check", () => {
  let dir: string;
  let home: string;
  let dest: string;

  beforeEach(async () => {
    dir = await realpath(await mkdtemp(join(tmpdir(), "ghost-skill-check-")));
    home = join(dir, "home");
    dest = join(dir, "skills", "ghost");
    vi.mocked(homedir).mockReturnValue(home);
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(dir, { recursive: true, force: true });
  });

  async function install(): Promise<void> {
    expect(
      (await runCli(["skill", "install", "--dest", "skills/ghost"], dir)).code,
    ).toBe(0);
  }
  const checkArgs = ["skill", "check", "--dest", "skills/ghost"];

  it("matches a fresh install, reports the resolved target, and does not write", async () => {
    await install();
    const before = await snapshotFiles(dest);
    const result = await runCli(checkArgs, dir);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain(`Target: ${dest}`);
    expect(result.stdout).toContain(
      "Result: installed files match the bundled ghost skill instructions.",
    );
    for (const file of BUNDLE)
      expect(result.stdout).toContain(`  ${file.path}`);
    expect(result.stdout).toContain(
      "does not prove the skill is runtime-active or semantically compatible",
    );
    expect(result.stderr).toBe("");
    await expect(snapshotFiles(dest)).resolves.toEqual(before);
  });

  it("flags changed, missing, and nested retired files deterministically without writing", async () => {
    await install();
    await writeFile(join(dest, "SKILL.md"), "edited\n");
    await writeFile(join(dest, "references", "schema.md"), "edited\n");
    await rm(join(dest, "references", "making.md"));
    await mkdir(join(dest, "references", "old"));
    await writeFile(join(dest, "references", "old", "retired.md"), "old\n");
    await writeFile(join(dest, "references", "retired.md"), "old\n");
    const before = await snapshotFiles(dest);

    const result = await runCli(checkArgs, dir);
    expect(result.code).toBe(1);
    expect(result.stdout).toContain("Missing files:\n  references/making.md");
    expect(result.stdout).toContain(
      "Changed files:\n  SKILL.md\n  references/schema.md",
    );
    expect(result.stdout).toContain(
      "Extra reference files:\n  references/old/retired.md\n  references/retired.md",
    );
    expect(result.stdout).toContain(
      `  ghost skill install --dest '${dest}' --force`,
    );
    await expect(snapshotFiles(dest)).resolves.toEqual(before);
  });

  it("reports an absent install without creating it", async () => {
    const result = await runCli(checkArgs, dir);
    expect(result.code).toBe(1);
    expect(result.stdout).toContain(`Target: ${dest}`);
    expect(result.stdout).toContain("Missing files:\n  SKILL.md");
    expect(result.stdout).toContain("  references/authoring.md");
    expect(result.stdout).not.toContain("Changed files:");
    expect(result.stdout).not.toContain("Extra reference files:");
    await expect(readdir(dir)).resolves.toEqual([]);
  });

  it("ignores unrelated root notes and metadata", async () => {
    await install();
    await writeFile(join(dest, "notes.md"), "keep\n");
    await writeFile(join(dest, "package.json"), '{"version":"0.0.0"}\n');
    const before = await snapshotFiles(dest);
    const result = await runCli(checkArgs, dir);
    expect(result.code).toBe(0);
    expect(result.stdout).not.toContain("notes.md");
    expect(result.stdout).not.toContain("package.json");
    await expect(snapshotFiles(dest)).resolves.toEqual(before);
  });

  it("flags retired symlinks without following their targets", async () => {
    await install();
    await symlink(join(dir, "absent"), join(dest, "references", "dangling.md"));
    await symlink(dest, join(dest, "references", "loop"), "dir");
    await symlink(
      join(dest, "SKILL.md"),
      join(dest, "references", "retired.md"),
    );
    const result = await runCli(checkArgs, dir);
    expect(result.code).toBe(1);
    expect(result.stdout).toContain(
      "Extra reference files:\n  references/dangling.md\n  references/loop\n  references/retired.md",
    );
  });

  it("reports a directory replacing an expected file as changed", async () => {
    await install();
    await rm(join(dest, "SKILL.md"));
    await mkdir(join(dest, "SKILL.md"));
    const result = await runCli(checkArgs, dir);
    expect(result.code).toBe(1);
    expect(result.stdout).toContain("Changed files:\n  SKILL.md");
  });

  it("honors custom destinations over agent selection and safely quotes reinstall commands", async () => {
    const custom = "skills/brand's ghost";
    await runCli(
      ["skill", "install", "--dest", custom, "--agent", "goose"],
      dir,
    );
    await writeFile(join(dir, custom, "SKILL.md"), "edited\n");
    const result = await runCli(
      ["skill", "check", "--dest", custom, "--agent", "goose"],
      dir,
    );
    expect(result.code).toBe(1);
    expect(result.stdout).toContain(`Target: ${join(dir, custom)}`);
    expect(result.stdout).toContain(
      `ghost skill install --dest '${join(dir, "skills", "brand'\\''s ghost")}' --force`,
    );
  });

  it.each([
    ["claude", ".claude"],
    ["cursor", ".cursor"],
    ["codex", ".codex"],
    ["opencode", ".opencode"],
    ["goose", ".agents"],
  ])("shares install's explicit %s destination within a mocked home", async (agent, folder) => {
    expect(
      (await runCli(["skill", "install", "--agent", agent], dir)).code,
    ).toBe(0);
    const result = await runCli(["skill", "check", "--agent", agent], dir);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain(
      `Target: ${join(home, folder, "skills", "ghost")}`,
    );
  });

  it.each([
    ".claude",
    ".cursor",
  ])("shares install's detected/default %s destination", async (folder) => {
    // An empty home falls back to Claude; a Cursor directory selects Cursor.
    if (folder === ".cursor")
      await mkdir(join(home, folder), { recursive: true });
    expect((await runCli(["skill", "install"], dir)).code).toBe(0);
    const result = await runCli(["skill", "check"], dir);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain(
      `Target: ${join(home, folder, "skills", "ghost")}`,
    );
  });

  it.each([
    ["--force"],
    ["--agent", "nope"],
    ["--dest", ""],
  ])("rejects invalid arguments %j with exit 2 and no writes", async (...args) => {
    await install();
    const before = await snapshotFiles(dest);
    const result = await runCli([...checkArgs, ...args], dir);
    expect(result.code).toBe(2);
    expect(result.stderr).toContain(args[0]);
    await expect(snapshotFiles(dest)).resolves.toEqual(before);
  });

  it.each([
    "readFile",
    "stat",
    "readdir",
  ] as const)("surfaces %s permission/I/O errors instead of reporting mismatches", async (operation) => {
    await install();
    const denial = Object.assign(new Error("permission denied"), {
      code: "EACCES",
    });
    const mock = vi.mocked({ readFile, stat, readdir }[operation]);
    mock.mockRejectedValueOnce(denial);
    const result = await runCli(checkArgs, dir);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("permission denied");
    expect(result.stdout).not.toContain("Result:");
  });
});

async function snapshotFiles(root: string): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  async function walk(dir: string, prefix: string): Promise<void> {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const absolute = join(dir, entry.name);
      const path = `${prefix}${entry.name}`;
      if (entry.isDirectory()) await walk(absolute, `${path}/`);
      else out[path] = await readFile(absolute, "utf-8");
    }
  }
  await walk(root, "");
  return out;
}
