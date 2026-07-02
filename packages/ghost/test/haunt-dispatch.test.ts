import { execFile } from "node:child_process";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const BIN = resolve(__dirname, "../dist/bin.js");

/**
 * `ghost haunt <cmd>` is a git-style external subcommand: the ghost bin
 * dispatches to a `ghost-haunt` binary resolved from PATH (with a
 * node_modules/.bin fallback). These tests run the built bin as a subprocess
 * because the dispatch happens in bin.ts, before the cac CLI exists.
 */
describe("ghost haunt dispatch", () => {
  let dir: string | undefined;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
    dir = undefined;
  });

  it("errors with exit 2 and an install hint when ghost-haunt is not installed", async () => {
    dir = await mkdtemp(join(tmpdir(), "ghost-dispatch-"));
    const result = await execFileAsync(
      process.execPath,
      [BIN, "haunt", "--version"],
      {
        cwd: dir,
        env: { ...process.env, PATH: dir },
      },
    ).catch(
      (err: NodeJS.ErrnoException & { code?: number; stderr?: string }) => err,
    );

    expect(result).toHaveProperty("code", 2);
    expect(String((result as { stderr?: string }).stderr)).toContain(
      "haunt is not installed",
    );
    expect(String((result as { stderr?: string }).stderr)).toContain(
      "@anarchitecture/ghost-haunt",
    );
  });

  it("dispatches to a ghost-haunt binary found on PATH and propagates its exit code", async () => {
    dir = await mkdtemp(join(tmpdir(), "ghost-dispatch-"));
    const stub = join(dir, "ghost-haunt");
    await writeFile(stub, `#!/bin/sh\necho "stub-haunt:$@"\nexit 7\n`, "utf-8");
    await chmod(stub, 0o755);

    const result = await execFileAsync(
      process.execPath,
      [BIN, "haunt", "review", "--json"],
      {
        cwd: dir,
        env: { ...process.env, PATH: `${dir}:${process.env.PATH ?? ""}` },
      },
    ).catch(
      (err: NodeJS.ErrnoException & { code?: number; stdout?: string }) => err,
    );

    expect(result).toHaveProperty("code", 7);
    expect(String((result as { stdout?: string }).stdout)).toContain(
      "stub-haunt:review --json",
    );
  });
});
