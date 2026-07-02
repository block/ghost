import { existsSync } from "node:fs";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { NO_TRUTHS_NOTICE, runInit } from "../src/commands/init.js";
import { validateHauntGraph } from "../src/graph/validate.js";
import { loadHauntPackage } from "../src/scan/load-package.js";

let dir: string | null = null;

afterEach(async () => {
  if (dir) {
    await rm(dir, { recursive: true, force: true });
    dir = null;
  }
});

describe("runInit", () => {
  it("scaffolds a two-dir package that loads clean", async () => {
    dir = await mkdtemp(join(tmpdir(), "haunt-init-"));
    const pkgDir = join(dir, ".haunt");
    const result = await runInit({
      package: pkgDir,
      ghostDir: join(dir, ".ghost"),
      id: "demo",
    });
    expect(result.code).toBe(0);
    expect(result.written).toEqual([
      "manifest.yml",
      "inventory/modals.md",
      "checks/contracts-stay-congruent.md",
    ]);

    const { pkg, report } = await loadHauntPackage(pkgDir);
    expect(report.errors).toBe(0);
    expect(pkg).not.toBeNull();
    if (!pkg) return;
    expect(pkg.manifest.id).toBe("demo");

    // The example check demonstrates the references grammar: one local
    // inventory id plus one fingerprint-shaped `node > Heading` target.
    const check = pkg.checks.get("contracts-stay-congruent");
    expect(check?.references).toEqual(["modals", "checkout > Density"]);

    // With no fingerprint present the fingerprint-shaped reference is an
    // info-level note, never an error.
    const graph = validateHauntGraph(pkg, null);
    expect(graph.errors).toBe(0);
    expect(
      graph.issues.some((i) => i.rule === "reference/no-fingerprint"),
    ).toBe(true);
  });

  it("refuses to overwrite an existing manifest without --force", async () => {
    dir = await mkdtemp(join(tmpdir(), "haunt-init-"));
    const pkgDir = join(dir, ".haunt");
    const ghostDir = join(dir, ".ghost");
    await runInit({ package: pkgDir, ghostDir });
    const second = await runInit({ package: pkgDir, ghostDir });
    expect(second.code).toBe(3);
  });

  it("scaffolds a missing .ghost/ fingerprint first and returns the notice", async () => {
    dir = await mkdtemp(join(tmpdir(), "haunt-init-"));
    const pkgDir = join(dir, ".haunt");
    const ghostDir = join(dir, ".ghost");
    const result = await runInit({ package: pkgDir, ghostDir });
    expect(result.code).toBe(0);
    expect(existsSync(join(ghostDir, "manifest.yml"))).toBe(true);
    expect(existsSync(join(pkgDir, "manifest.yml"))).toBe(true);
    expect(result.ghostWritten).toContain("manifest.yml");
    expect(result.notice).toBe(NO_TRUTHS_NOTICE);
    expect(NO_TRUTHS_NOTICE).toContain("scaffolded .ghost/");
  });

  it("leaves an existing .ghost/ fingerprint untouched", async () => {
    dir = await mkdtemp(join(tmpdir(), "haunt-init-"));
    const pkgDir = join(dir, ".haunt");
    const ghostDir = join(dir, ".ghost");
    // First init scaffolds the fingerprint; record its state.
    await runInit({ package: pkgDir, ghostDir });
    const before = await readFile(join(ghostDir, "manifest.yml"), "utf-8");
    const filesBefore = (await readdir(ghostDir, { recursive: true })).sort();

    // Second init (forced, so the .haunt manifest is rewritten) must not
    // touch the existing fingerprint or report a notice.
    const second = await runInit({ package: pkgDir, ghostDir, force: true });
    expect(second.code).toBe(0);
    expect(second.ghostWritten).toBeUndefined();
    expect(second.notice).toBeUndefined();
    expect(await readFile(join(ghostDir, "manifest.yml"), "utf-8")).toBe(
      before,
    );
    expect((await readdir(ghostDir, { recursive: true })).sort()).toEqual(
      filesBefore,
    );
  });
});
