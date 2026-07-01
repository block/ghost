import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadHauntPackage } from "../src/scan/load-package.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => join(here, "fixtures", name);

describe("loadHauntPackage", () => {
  it("loads a valid package with all four tiers", async () => {
    const { pkg, report } = await loadHauntPackage(fixture("valid"));
    expect(report.errors).toBe(0);
    expect(pkg).not.toBeNull();
    expect(pkg?.manifest.id).toBe("demo");
    expect(pkg?.tenets.has("composition")).toBe(true);
    expect(pkg?.inventory.get("modals")?.frontmatter.paths).toEqual([
      "packages/geist/src/Modal/**",
      "apps/site/components/overlays/**",
    ]);
    expect(pkg?.surfaces.get("checkout")?.frontmatter.honors).toEqual([
      "composition",
    ]);
    expect(
      pkg?.checks.get("density-does-not-creep")?.frontmatter.grounds,
    ).toContain("tenets/composition");
  });

  it("errors when the manifest is missing", async () => {
    const { pkg, report } = await loadHauntPackage(fixture("nonexistent-dir"));
    expect(pkg).toBeNull();
    expect(report.issues.some((i) => i.rule === "manifest/missing")).toBe(true);
  });

  it("rejects nested folders inside a tier", async () => {
    const { report } = await loadHauntPackage(fixture("nested"));
    expect(report.issues.some((i) => i.rule === "tier/no-nesting")).toBe(true);
  });
});
