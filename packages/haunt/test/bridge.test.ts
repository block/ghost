import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { resolveBridge } from "../src/bridge/resolve.js";
import { loadHauntPackage } from "../src/scan/load-package.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => join(here, "fixtures", name);

async function loadValid() {
  const { pkg } = await loadHauntPackage(fixture("valid"));
  if (!pkg) throw new Error("valid fixture failed to load");
  return pkg;
}

const diffTouching = (path: string) =>
  `diff --git a/${path} b/${path}\n--- a/${path}\n+++ b/${path}\n@@ -1 +1 @@\n-old\n+new\n`;

describe("resolveBridge", () => {
  it("bridges one hop: diff files → inventory → offered checks", async () => {
    const pkg = await loadValid();
    const res = resolveBridge(
      pkg,
      diffTouching("packages/geist/src/Modal/Modal.tsx"),
    );

    expect(res.inventory.map((i) => i.id)).toEqual(["modals"]);
    const check = res.offeredChecks.find(
      (c) => c.id === "density-does-not-creep",
    );
    expect(check).toBeDefined();
    expect(check?.via).toContain("modals");
    expect(check?.referencesFingerprint).toBe(true); // checkout > Density
  });

  it("always offers checks whose references are all fingerprint-shaped", async () => {
    const pkg = await loadValid();
    const res = resolveBridge(
      pkg,
      diffTouching("apps/site/app/settings/page.tsx"),
    );

    // No inventory matched, but the fingerprint-only check is still offered.
    expect(res.inventory).toHaveLength(0);
    expect(res.offeredChecks.map((c) => c.id)).toEqual(["restraint-holds"]);
    expect(res.offeredChecks[0]?.referencesFingerprint).toBe(true);
  });

  it("reports unbridged files as a coverage gap", async () => {
    const pkg = await loadValid();
    const res = resolveBridge(
      pkg,
      diffTouching("apps/site/app/settings/page.tsx"),
    );

    const gap = res.gaps.find((g) => g.kind === "unbridged-file");
    expect(gap?.files).toContain("apps/site/app/settings/page.tsx");
  });

  it("reports touched inventory no check references directly", async () => {
    const pkg = await loadValid();
    const res = resolveBridge(
      pkg,
      diffTouching("packages/geist/src/Button/Button.tsx"),
    );

    // buttons is matched by the diff but no check references it.
    expect(res.inventory.map((i) => i.id)).toEqual(["buttons"]);
    const gap = res.gaps.find((g) => g.kind === "unreferenced-inventory");
    expect(gap?.files).toEqual(["buttons"]);
  });
});
