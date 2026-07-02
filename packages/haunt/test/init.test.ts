import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runInit } from "../src/commands/init.js";
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
    const result = await runInit({ package: pkgDir, id: "demo" });
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
    await runInit({ package: pkgDir });
    const second = await runInit({ package: pkgDir });
    expect(second.code).toBe(3);
  });
});
