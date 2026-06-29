import { execFile } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveContractDir } from "../src/scan/contract-resolver.js";

const execFileAsync = promisify(execFile);

describe("resolveContractDir", () => {
  let dir: string;

  beforeEach(async () => {
    dir = join(
      tmpdir(),
      `ghost-contract-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await mkdir(dir, { recursive: true });
    await execFileAsync("git", ["init", "-q"], { cwd: dir });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("resolves the in-repo contract `.` to <repoRoot>/.ghost", async () => {
    await mkdir(join(dir, ".ghost"), { recursive: true });
    const resolved = await resolveContractDir(".", dir, dir);
    expect(resolved).toBe(join(dir, ".ghost"));
  });

  it("returns null for `.` when there is no root .ghost", async () => {
    expect(await resolveContractDir(".", dir, dir)).toBeNull();
  });

  it("resolves an npm name from node_modules", async () => {
    const contractDir = join(dir, "node_modules", "@acme", "brand", ".ghost");
    await mkdir(contractDir, { recursive: true });
    await mkdir(join(dir, "apps", "web"), { recursive: true });
    const resolved = await resolveContractDir(
      "@acme/brand",
      join(dir, "apps", "web"),
      dir,
    );
    expect(resolved).toBe(contractDir);
  });

  it("returns null for an unresolved npm name", async () => {
    expect(await resolveContractDir("@acme/missing", dir, dir)).toBeNull();
  });

  it("returns null for an unsupported reference kind", async () => {
    await writeFile(join(dir, "marker"), "x");
    expect(await resolveContractDir("../brand", dir, dir)).toBeNull();
  });
});
