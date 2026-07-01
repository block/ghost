import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadHauntPackage } from "../src/scan/load-package.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => join(here, "fixtures", name);

describe("loadHauntPackage", () => {
  it("loads a valid two-dir package", async () => {
    const { pkg, report } = await loadHauntPackage(fixture("valid"));
    expect(report.errors).toBe(0);
    expect(pkg).not.toBeNull();
    expect(pkg?.manifest.id).toBe("demo");
    expect(pkg?.inventory.get("modals")?.frontmatter.paths).toEqual([
      "packages/geist/src/Modal/**",
      "apps/site/components/overlays/**",
    ]);
    const check = pkg?.checks.get("density-does-not-creep");
    expect(check?.frontmatter.name).toBe("density-does-not-creep");
    expect(check?.frontmatter.severity).toBe("high");
    expect(check?.references).toEqual(["modals", "checkout > Density"]);
  });

  it("errors when the manifest is missing", async () => {
    const { pkg, report } = await loadHauntPackage(fixture("nonexistent-dir"));
    expect(pkg).toBeNull();
    expect(report.issues.some((i) => i.rule === "manifest/missing")).toBe(true);
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
});
