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
  it("walks diff → inventory → surfaces → tenets → offered checks", async () => {
    const pkg = await loadValid();
    const res = resolveBridge(
      pkg,
      diffTouching("packages/geist/src/Modal/Modal.tsx"),
    );

    expect(res.inventory.map((i) => i.id)).toEqual(["modals"]);
    expect(res.surfaces).toEqual(["checkout"]);
    expect(res.tenets).toEqual(["composition"]);
    expect(res.offeredChecks.map((c) => c.id)).toContain(
      "density-does-not-creep",
    );

    const check = res.offeredChecks.find(
      (c) => c.id === "density-does-not-creep",
    );
    expect(check?.groundsTenet).toBe(true); // grounds tenets/composition
    expect(check?.via).toContain("surfaces/checkout");
  });

  it("reports unbridged files as a coverage gap", async () => {
    const pkg = await loadValid();
    const res = resolveBridge(
      pkg,
      diffTouching("apps/site/app/settings/page.tsx"),
    );

    expect(res.inventory).toHaveLength(0);
    expect(res.offeredChecks).toHaveLength(0);
    expect(res.gaps.some((g) => g.kind === "unbridged-file")).toBe(true);
    const gap = res.gaps.find((g) => g.kind === "unbridged-file");
    expect(gap?.files).toContain("apps/site/app/settings/page.tsx");
  });
});
