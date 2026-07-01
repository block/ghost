import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  buildReviewPacket,
  formatReviewPacket,
} from "../src/commands/review-packet.js";
import { loadFingerprint } from "../src/fingerprint/load.js";
import { loadHauntPackage } from "../src/scan/load-package.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => join(here, "fixtures", name);

async function loadValid() {
  const { pkg } = await loadHauntPackage(fixture("valid"));
  if (!pkg) throw new Error("valid fixture failed to load");
  return pkg;
}

async function loadGhostFixture() {
  const fingerprint = await loadFingerprint({ ghostDir: fixture("ghost") });
  if (!fingerprint) throw new Error("ghost fixture failed to load");
  return fingerprint;
}

const diff = (path: string) =>
  `diff --git a/${path} b/${path}\n--- a/${path}\n+++ b/${path}\n@@ -1 +1 @@\n-a\n+b\n`;

describe("buildReviewPacket", () => {
  it("assembles baselines: local inventory prose + fingerprint node sections", async () => {
    const pkg = await loadValid();
    const fingerprint = await loadGhostFixture();
    const packet = buildReviewPacket(
      pkg,
      fingerprint,
      diff("packages/geist/src/Modal/x.tsx"),
    );

    expect(packet.packageId).toBe("demo");
    expect(packet.fingerprintId).toBe("demo-fingerprint");
    expect(packet.inventory[0]?.id).toBe("modals");
    expect(packet.inventory[0]?.prose).toContain("No nested modals");

    const check = packet.checks.find((c) => c.id === "density-does-not-creep");
    expect(check).toBeDefined();
    expect(check?.referencesFingerprint).toBe(true);

    const local = check?.baseline.find((b) => b.ref === "modals");
    expect(local?.kind).toBe("local");
    expect(local?.body).toContain("No nested modals");

    // Heading anchor slices the node body to the matching section.
    const sliced = check?.baseline.find((b) => b.ref === "checkout > Density");
    expect(sliced?.kind).toBe("fingerprint");
    expect(sliced?.body).toContain("earns its density");
    expect(sliced?.body).not.toContain("confirmation step");
    expect(sliced?.warning).toBeUndefined();

    // The fingerprint section carries the resolved truths in play.
    expect(packet.fingerprint.map((n) => n.ref)).toContain(
      "checkout > Density",
    );
  });

  it("falls back to the whole body with a warning when the heading is missing", async () => {
    const pkg = await loadValid();
    const fingerprint = await loadGhostFixture();
    // Rewrite the check's reference to a heading that does not exist.
    const check = pkg.checks.get("density-does-not-creep");
    if (!check) throw new Error("check missing");
    check.references = ["modals", "checkout > Nonexistent"];

    const packet = buildReviewPacket(
      pkg,
      fingerprint,
      diff("packages/geist/src/Modal/x.tsx"),
    );
    const baseline = packet.checks
      .find((c) => c.id === "density-does-not-creep")
      ?.baseline.find((b) => b.ref === "checkout > Nonexistent");
    expect(baseline?.warning).toContain("not found");
    expect(baseline?.body).toContain("confirmation step");
  });

  it("embeds coverage gaps for unbridged files", async () => {
    const pkg = await loadValid();
    const fingerprint = await loadGhostFixture();
    const packet = buildReviewPacket(
      pkg,
      fingerprint,
      diff("apps/site/app/settings/page.tsx"),
    );
    expect(packet.gaps.some((g) => g.kind === "unbridged-file")).toBe(true);
  });

  it("renders a markdown prompt with the finding instructions", async () => {
    const pkg = await loadValid();
    const fingerprint = await loadGhostFixture();
    const packet = buildReviewPacket(
      pkg,
      fingerprint,
      diff("packages/geist/src/Modal/x.tsx"),
    );
    const md = formatReviewPacket(packet);
    expect(md).toContain("# Haunt review");
    expect(md).toContain("Fingerprint truths in play");
    expect(md).toContain("Offered checks — weigh which apply");
    expect(md).toContain("P0");
    expect(md).toContain("```diff");
  });
});
