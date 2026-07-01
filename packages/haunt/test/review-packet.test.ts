import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  buildReviewPacket,
  formatReviewPacket,
} from "../src/commands/review-packet.js";
import { loadHauntPackage } from "../src/scan/load-package.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => join(here, "fixtures", name);

async function loadValid() {
  const { pkg } = await loadHauntPackage(fixture("valid"));
  if (!pkg) throw new Error("valid fixture failed to load");
  return pkg;
}

const diff = (path: string) =>
  `diff --git a/${path} b/${path}\n--- a/${path}\n+++ b/${path}\n@@ -1 +1 @@\n-a\n+b\n`;

describe("buildReviewPacket", () => {
  it("assembles evidence: material prose, baseline, and offered checks", async () => {
    const pkg = await loadValid();
    const packet = buildReviewPacket(
      pkg,
      diff("packages/geist/src/Modal/x.tsx"),
    );

    expect(packet.packageId).toBe("demo");
    expect(packet.inventory[0]?.id).toBe("modals");
    expect(packet.inventory[0]?.prose).toContain("No nested modals");
    expect(packet.tenets.map((t) => t.ref)).toContain("tenets/composition");

    const check = packet.checks.find((c) => c.id === "density-does-not-creep");
    expect(check).toBeDefined();
    expect(check?.groundsTenet).toBe(true);
    // baseline includes the grounded tenet + surface prose
    expect(check?.baseline.map((b) => b.ref)).toEqual([
      "tenets/composition",
      "surfaces/checkout",
    ]);
  });

  it("embeds coverage gaps for unbridged files", async () => {
    const pkg = await loadValid();
    const packet = buildReviewPacket(
      pkg,
      diff("apps/site/app/settings/page.tsx"),
    );
    expect(packet.checks).toHaveLength(0);
    expect(packet.gaps.some((g) => g.kind === "unbridged-file")).toBe(true);
  });

  it("renders a markdown prompt with the finding instructions", async () => {
    const pkg = await loadValid();
    const packet = buildReviewPacket(
      pkg,
      diff("packages/geist/src/Modal/x.tsx"),
    );
    const md = formatReviewPacket(packet);
    expect(md).toContain("# Haunt review");
    expect(md).toContain("Offered checks — judge which apply");
    expect(md).toContain("P0");
    expect(md).toContain("```diff");
  });
});
