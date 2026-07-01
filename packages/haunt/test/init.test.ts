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
  it("scaffolds a package that loads and validates clean", async () => {
    dir = await mkdtemp(join(tmpdir(), "haunt-init-"));
    const pkgDir = join(dir, ".haunt");
    const result = await runInit({ package: pkgDir, id: "demo" });
    expect(result.code).toBe(0);
    expect(result.written).toContain("manifest.yml");
    expect(result.written).toContain("checks/density-does-not-creep.md");

    const { pkg, report } = await loadHauntPackage(pkgDir);
    expect(report.errors).toBe(0);
    expect(pkg).not.toBeNull();
    if (!pkg) return;
    expect(pkg.manifest.id).toBe("demo");

    // The scaffold is internally consistent — no dangling edges, no orphans.
    const graph = validateHauntGraph(pkg);
    expect(graph.errors).toBe(0);
    expect(graph.warnings).toBe(0);
  });

  it("refuses to overwrite an existing manifest without --force", async () => {
    dir = await mkdtemp(join(tmpdir(), "haunt-init-"));
    const pkgDir = join(dir, ".haunt");
    await runInit({ package: pkgDir });
    const second = await runInit({ package: pkgDir });
    expect(second.code).toBe(3);
  });
});
