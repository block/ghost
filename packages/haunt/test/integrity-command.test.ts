import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { listRepoFiles } from "../src/bridge/tree.js";
import { runInit } from "../src/commands/init.js";
import { runIntegrity } from "../src/commands/integrity.js";

const execFileAsync = promisify(execFile);

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => join(here, "fixtures", name);

let dir: string | null = null;

afterEach(async () => {
  if (dir) {
    await rm(dir, { recursive: true, force: true });
    dir = null;
  }
});

/** Scaffold a temp git repo with a `.ghost/haunt/` package and a tracked Modal file. */
async function scaffoldRepo(): Promise<string> {
  const repo = await mkdtemp(join(tmpdir(), "haunt-integrity-"));
  await execFileAsync("git", ["init", "-q"], { cwd: repo });
  const modal = join(repo, "packages/geist/src/Modal");
  await mkdir(modal, { recursive: true });
  await writeFile(join(modal, "Modal.tsx"), "export const Modal = 0;\n");
  await runInit({ ghostDir: join(repo, ".ghost") });
  await execFileAsync("git", ["add", "-A"], { cwd: repo });
  return repo;
}

describe("listRepoFiles", () => {
  it("errors clearly outside a git repository", async () => {
    dir = await mkdtemp(join(tmpdir(), "haunt-nogit-"));
    await expect(listRepoFiles(dir)).rejects.toThrow(/git repository/);
  });

  it("lists tracked files as repo-relative paths", async () => {
    dir = await scaffoldRepo();
    const files = await listRepoFiles(dir);
    expect(files).toContain("packages/geist/src/Modal/Modal.tsx");
    expect(files).toContain(".ghost/haunt/inventory/modals.md");
  });
});

describe("runIntegrity", () => {
  it("hard-errors (exit 2) with an on-ramp when no .ghost/ resolves", async () => {
    dir = await scaffoldRepo();
    // A haunt package without a fingerprint manifest.
    const ghostDir = join(dir, "other-ghost");
    await cp(fixture("valid"), join(ghostDir, "haunt"), { recursive: true });
    const result = await runIntegrity({
      cwd: dir,
      ghostDir,
    });
    expect(result.code).toBe(2);
    expect(result.packet).toBeNull();
    expect(result.output).toContain("ghost init");
    expect(result.output).toContain("@anarchitecture/ghost-fingerprint");
  });

  it("builds a packet when --ghost-dir points at a fingerprint", async () => {
    dir = await scaffoldRepo();
    // Replace the scaffolded haunt subtree with the richer valid fixture and
    // the ghost fixture's authored nodes.
    const ghostDir = join(dir, ".ghost");
    await cp(fixture("ghost"), ghostDir, { recursive: true, force: true });
    await rm(join(ghostDir, "haunt"), { recursive: true, force: true });
    await cp(fixture("valid"), join(ghostDir, "haunt"), { recursive: true });
    await execFileAsync("git", ["add", "-A"], { cwd: dir });

    const result = await runIntegrity({ cwd: dir, ghostDir });
    expect(result.code).toBe(0);
    expect(result.packet?.fingerprintId).toBe("demo-fingerprint");
    expect(result.output).toContain("# Haunt integrity");

    const modals = result.packet?.materials.find((m) => m.id === "modals");
    expect(modals?.fileCount).toBe(1);
    expect(
      modals?.paths.find((p) => p.glob === "packages/geist/src/Modal/**")
        ?.matches,
    ).toBe(1);
  });
});
