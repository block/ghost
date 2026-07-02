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
  it("scaffolds the .ghost/haunt/ subtree — two dirs, no manifest — that loads clean", async () => {
    dir = await mkdtemp(join(tmpdir(), "haunt-init-"));
    const ghostDir = join(dir, ".ghost");
    const result = await runInit({ ghostDir });
    expect(result.code).toBe(0);
    expect(result.dir).toBe(join(ghostDir, "haunt"));
    expect(result.written).toEqual([
      "inventory/modals.md",
      "checks/contracts-stay-congruent.md",
    ]);

    // One .ghost/ root: fingerprint files at the root plus the haunt/ subtree.
    // No haunt manifest is ever written.
    expect(existsSync(join(ghostDir, "manifest.yml"))).toBe(true);
    expect(existsSync(join(ghostDir, "haunt"))).toBe(true);
    expect(existsSync(join(ghostDir, "haunt", "manifest.yml"))).toBe(false);

    const { pkg, report } = await loadHauntPackage(join(ghostDir, "haunt"));
    expect(report.errors).toBe(0);
    expect(pkg).not.toBeNull();
    if (!pkg) return;

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

  it("refuses to overwrite an existing haunt/ subtree without --force", async () => {
    dir = await mkdtemp(join(tmpdir(), "haunt-init-"));
    const ghostDir = join(dir, ".ghost");
    await runInit({ ghostDir });
    const second = await runInit({ ghostDir });
    expect(second.code).toBe(3);
    expect(second.message).toContain("--force");
  });

  it("scaffolds a missing .ghost/ fingerprint first and returns the notice", async () => {
    dir = await mkdtemp(join(tmpdir(), "haunt-init-"));
    const ghostDir = join(dir, ".ghost");
    const result = await runInit({ ghostDir });
    expect(result.code).toBe(0);
    expect(existsSync(join(ghostDir, "manifest.yml"))).toBe(true);
    expect(existsSync(join(ghostDir, "glossary.md"))).toBe(true);
    expect(existsSync(join(ghostDir, "haunt", "inventory", "modals.md"))).toBe(
      true,
    );
    expect(result.ghostWritten).toContain("manifest.yml");
    expect(result.notice).toBe(NO_TRUTHS_NOTICE);
    expect(NO_TRUTHS_NOTICE).toContain("scaffolded .ghost/");
  });

  it("leaves an existing .ghost/ fingerprint untouched", async () => {
    dir = await mkdtemp(join(tmpdir(), "haunt-init-"));
    const ghostDir = join(dir, ".ghost");
    // First init scaffolds the fingerprint; record its root state.
    await runInit({ ghostDir });
    const before = await readFile(join(ghostDir, "manifest.yml"), "utf-8");
    const rootBefore = (await readdir(ghostDir)).sort();

    // Second init (forced, so the haunt subtree is rewritten) must not
    // touch the existing fingerprint or report a notice.
    const second = await runInit({ ghostDir, force: true });
    expect(second.code).toBe(0);
    expect(second.ghostWritten).toBeUndefined();
    expect(second.notice).toBeUndefined();
    expect(await readFile(join(ghostDir, "manifest.yml"), "utf-8")).toBe(
      before,
    );
    expect((await readdir(ghostDir)).sort()).toEqual(rootBefore);
  });
});
