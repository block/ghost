import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it, vi } from "vitest";
import { exitCli } from "../src/commands/errors.js";

const execFileAsync = promisify(execFile);
const TERMINAL_SENTINEL = "ghost-terminal-sentinel-9c25894d1b2e4d58";

describe("CLI process exit lifecycle", () => {
  let dirs: string[] = [];

  afterEach(async () => {
    for (const dir of dirs) {
      await rm(dir, { recursive: true, force: true });
    }
    dirs = [];
    vi.restoreAllMocks();
  });

  it("keeps raw process.exit calls centralized in commands/errors.ts", async () => {
    const root = resolve("packages/ghost/src/commands");
    const offenders: string[] = [];

    for (const file of await listTypeScriptFiles(root)) {
      const source = await readFile(file, "utf-8");
      if (!source.includes("process.exit(")) continue;
      const normalized = file.split(sep).join("/");
      if (!normalized.endsWith("packages/ghost/src/commands/errors.ts")) {
        offenders.push(normalized);
      }
    }

    expect(offenders).toEqual([]);
  });

  it("waits for stdout and stderr flush callbacks before exiting with the exact code", async () => {
    const callbacks: Array<() => void> = [];
    const stdoutWrite = vi
      .spyOn(process.stdout, "write")
      .mockImplementation((_chunk: string | Uint8Array, callback?: unknown) => {
        if (typeof callback === "function") callbacks.push(callback);
        return true;
      });
    const stderrWrite = vi
      .spyOn(process.stderr, "write")
      .mockImplementation((_chunk: string | Uint8Array, callback?: unknown) => {
        if (typeof callback === "function") callbacks.push(callback);
        return true;
      });
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      return undefined as never;
    });

    const exiting = exitCli(7);
    await Promise.resolve();

    expect(stdoutWrite).toHaveBeenCalledTimes(1);
    expect(stderrWrite).toHaveBeenCalledTimes(0);
    expect(exitSpy).not.toHaveBeenCalled();

    callbacks.shift()?.();
    await Promise.resolve();

    expect(stderrWrite).toHaveBeenCalledTimes(1);
    expect(exitSpy).not.toHaveBeenCalled();

    callbacks.shift()?.();
    await exiting;

    expect(exitSpy).toHaveBeenCalledTimes(1);
    expect(exitSpy).toHaveBeenCalledWith(7);
  });

  it("preserves large piped pull output through process exit", async () => {
    const bin = resolve("packages/ghost/dist/bin.js");
    expect(
      existsSync(bin),
      "packages/ghost/dist/bin.js is missing. Run `pnpm build` before this subprocess regression test.",
    ).toBe(true);

    const dir = await makeTempDir();
    await writeLargePullFixture(dir);

    const markdown = await execGhost(bin, ["pull", "principle.long"], dir);
    expect(markdown.code).toBe(0);
    expect(markdown.stdout.length).toBeGreaterThan(64 * 1024);
    expect(markdown.stdout).toContain(TERMINAL_SENTINEL);

    const json = await execGhost(
      bin,
      ["pull", "principle.long", "--format", "json"],
      dir,
    );
    expect(json.code).toBe(0);
    const payload = JSON.parse(json.stdout) as {
      nodes: Array<{ body: string }>;
    };
    expect(payload.nodes[0].body.length).toBeGreaterThan(64 * 1024);
    expect(payload.nodes[0].body).toContain(TERMINAL_SENTINEL);

    const unknown = await execGhost(bin, ["pull", "missing.only"], dir);
    expect(unknown.code).toBe(2);
    expect(unknown.stdout).toBe("");
    expect(unknown.stderr).toContain("Warning: unknown node `missing.only`");
    expect(unknown.stderr).toContain("Run `ghost gather` to list every node.");
  });

  async function makeTempDir(): Promise<string> {
    const dir = join(
      tmpdir(),
      `ghost-cli-exit-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await mkdir(dir, { recursive: true });
    dirs.push(dir);
    return dir;
  }
});

async function listTypeScriptFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listTypeScriptFiles(path)));
    } else if (entry.isFile() && path.endsWith(".ts")) {
      files.push(path);
    }
  }
  return files;
}

async function writeLargePullFixture(dir: string): Promise<void> {
  const ghost = join(dir, ".ghost");
  await mkdir(ghost, { recursive: true });
  await Promise.all([
    writeFile(
      join(ghost, "manifest.yml"),
      "schema: ghost.package/v1\nid: pipe-regression\ncover: index\n",
    ),
    writeFile(
      join(ghost, "glossary.md"),
      [
        "---",
        "kinds:",
        "  - name: principle",
        "---",
        "",
        "# principle",
        "",
        "Rules.",
        "",
      ].join("\n"),
    ),
    writeFile(
      join(ghost, "index.md"),
      "---\ndescription: Cover.\n---\n\nCover.\n",
    ),
    writeFile(
      join(ghost, "principle.long.md"),
      [
        "---",
        "description: Large pull body.",
        "---",
        "",
        "x".repeat(2 * 1024 * 1024),
        TERMINAL_SENTINEL,
        "",
      ].join("\n"),
    ),
  ]);
}

async function execGhost(
  bin: string,
  args: string[],
  cwd: string,
): Promise<{ code: number; stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execFileAsync(
      process.execPath,
      [bin, ...args],
      {
        cwd,
        encoding: "utf-8",
        maxBuffer: 16 * 1024 * 1024,
      },
    );
    return { code: 0, stdout, stderr };
  } catch (err) {
    const failed = err as {
      code?: number;
      stdout?: string;
      stderr?: string;
    };
    return {
      code: typeof failed.code === "number" ? failed.code : 1,
      stdout: failed.stdout ?? "",
      stderr: failed.stderr ?? "",
    };
  }
}
