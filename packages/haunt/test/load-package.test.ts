import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { loadHauntPackage } from "../src/scan/load-package.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => join(here, "fixtures", name);

let tmp: string | null = null;

afterEach(async () => {
  if (tmp) {
    await rm(tmp, { recursive: true, force: true });
    tmp = null;
  }
});

describe("loadHauntPackage", () => {
  it("loads a valid two-dir package (no manifest — the fingerprint anchors)", async () => {
    const { pkg, report } = await loadHauntPackage(fixture("valid"));
    expect(report.errors).toBe(0);
    expect(pkg).not.toBeNull();
    expect(pkg?.inventory.get("modals")?.frontmatter.paths).toEqual([
      "packages/geist/src/Modal/**",
      "apps/site/components/overlays/**",
    ]);
    const check = pkg?.checks.get("density-does-not-creep");
    expect(check?.frontmatter.name).toBe("density-does-not-creep");
    expect(check?.frontmatter.severity).toBe("high");
    expect(check?.references).toEqual(["modals", "checkout > Density"]);
  });

  it("errors when the haunt/ dir is missing", async () => {
    const { pkg, report } = await loadHauntPackage(fixture("nonexistent-dir"));
    expect(pkg).toBeNull();
    expect(report.issues.some((i) => i.rule === "package/missing")).toBe(true);
  });

  it("errors on a check without references", async () => {
    const { pkg, report } = await loadHauntPackage(fixture("broken"));
    expect(pkg).toBeNull();
    expect(
      report.issues.some((i) => i.rule === "check/references-missing"),
    ).toBe(true);
  });

  it("rejects nested folders inside a dir", async () => {
    const { report } = await loadHauntPackage(fixture("broken"));
    expect(report.issues.some((i) => i.rule === "dir/no-nesting")).toBe(true);
  });

  it("warns on leftover dirs from the retired four-tier shape", async () => {
    const { report } = await loadHauntPackage(fixture("broken"));
    const legacy = report.issues.find((i) => i.rule === "package/legacy-dir");
    expect(legacy?.severity).toBe("warning");
    expect(legacy?.where).toBe("tenets/");
  });

  it("warns when a legacy top-level .haunt/ sits beside the .ghost/ dir", async () => {
    tmp = await mkdtemp(join(tmpdir(), "haunt-legacy-"));
    const hauntDir = join(tmp, ".ghost", "haunt");
    await mkdir(join(hauntDir, "inventory"), { recursive: true });
    await writeFile(
      join(hauntDir, "inventory", "modals.md"),
      "---\ndescription: Modals.\npaths:\n  - src/**\n---\n\nModal material.\n",
    );
    // The decoy: a legacy standalone .haunt/ next to .ghost/.
    await mkdir(join(tmp, ".haunt"), { recursive: true });

    const { pkg, report } = await loadHauntPackage(hauntDir);
    expect(pkg).not.toBeNull();
    const legacy = report.issues.find(
      (i) => i.rule === "package/legacy-haunt-dir",
    );
    expect(legacy?.severity).toBe("warning");
    expect(legacy?.message).toContain(".ghost/haunt/");
  });
});
