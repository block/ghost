import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { partitionInventory } from "../src/bridge/tree.js";
import {
  buildIntegrityPacket,
  formatIntegrityPacket,
} from "../src/commands/integrity-packet.js";
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

const FILES = [
  "packages/geist/src/Modal/Modal.tsx",
  "packages/geist/src/Modal/Sheet.tsx",
  "apps/site/components/overlays/Drawer.tsx",
  "packages/geist/src/Button/Button.tsx",
  "apps/site/app/settings/page.tsx",
];

describe("partitionInventory", () => {
  it("partitions the repo tree by material paths, dead materials included", async () => {
    const pkg = await loadValid();
    const partition = partitionInventory(pkg, FILES);
    expect(partition.get("modals")).toEqual([
      "packages/geist/src/Modal/Modal.tsx",
      "packages/geist/src/Modal/Sheet.tsx",
      "apps/site/components/overlays/Drawer.tsx",
    ]);
    expect(partition.get("buttons")).toEqual([
      "packages/geist/src/Button/Button.tsx",
    ]);

    // A material whose globs match nothing still appears — empty.
    const dead = partitionInventory(pkg, ["apps/site/app/settings/page.tsx"]);
    expect(dead.get("modals")).toEqual([]);
    expect(dead.get("buttons")).toEqual([]);
  });
});

describe("buildIntegrityPacket", () => {
  it("binds checks to the materials they reference, with baselines via the shared resolver", async () => {
    const pkg = await loadValid();
    const fingerprint = await loadGhostFixture();
    const packet = buildIntegrityPacket(pkg, fingerprint, FILES);

    expect(packet.fingerprintId).toBe("demo-fingerprint");

    const modals = packet.materials.find((m) => m.id === "modals");
    expect(modals).toBeDefined();
    expect(modals?.prose).toContain("No nested modals");
    expect(modals?.fileCount).toBe(3);
    expect(modals?.checks.map((c) => c.id)).toEqual(["density-does-not-creep"]);

    // Baseline slicing via the shared resolver: the anchored heading section.
    const check = modals?.checks[0];
    const local = check?.baseline.find((b) => b.ref === "modals");
    expect(local?.kind).toBe("local");
    const sliced = check?.baseline.find((b) => b.ref === "checkout > Density");
    expect(sliced?.kind).toBe("fingerprint");
    expect(sliced?.body).toContain("earns its density");
    expect(sliced?.body).not.toContain("confirmation step");

    // The fingerprint section carries the resolved truths in play.
    expect(packet.fingerprint.map((n) => n.ref)).toContain(
      "checkout > Density",
    );
    expect(packet.fingerprint.map((n) => n.ref)).toContain("core");
  });

  it("renders a multi-material check in each referenced material's section", async () => {
    const pkg = await loadValid();
    const fingerprint = await loadGhostFixture();
    const check = pkg.checks.get("density-does-not-creep");
    if (!check) throw new Error("check missing");
    check.references = ["modals", "buttons", "checkout > Density"];

    const packet = buildIntegrityPacket(pkg, fingerprint, FILES);
    const modals = packet.materials.find((m) => m.id === "modals");
    const buttons = packet.materials.find((m) => m.id === "buttons");
    expect(modals?.checks.map((c) => c.id)).toContain("density-does-not-creep");
    expect(buttons?.checks.map((c) => c.id)).toContain(
      "density-does-not-creep",
    );
    // Baselines render per appearance — packet size over cleverness.
    expect(modals?.checks[0]?.baseline.length).toBeGreaterThan(0);
    expect(buttons?.checks[0]?.baseline.length).toBeGreaterThan(0);
    // It is not duplicated into the global section.
    expect(packet.globalChecks.map((c) => c.id)).not.toContain(
      "density-does-not-creep",
    );
  });

  it("offers fingerprint-only checks once, in the global section", async () => {
    const pkg = await loadValid();
    const fingerprint = await loadGhostFixture();
    const packet = buildIntegrityPacket(pkg, fingerprint, FILES);

    expect(packet.globalChecks.map((c) => c.id)).toEqual(["restraint-holds"]);
    const global = packet.globalChecks[0];
    expect(global?.referencesFingerprint).toBe(true);
    expect(global?.baseline.find((b) => b.ref === "core")?.kind).toBe(
      "fingerprint",
    );
    for (const m of packet.materials) {
      expect(m.checks.map((c) => c.id)).not.toContain("restraint-holds");
    }
  });

  it("lists sibling materials as pointers — id, description, paths, no body", async () => {
    const pkg = await loadValid();
    const fingerprint = await loadGhostFixture();
    const packet = buildIntegrityPacket(pkg, fingerprint, FILES);

    const modals = packet.materials.find((m) => m.id === "modals");
    expect(modals?.siblings.map((s) => s.id)).toEqual(["buttons"]);
    const sibling = modals?.siblings[0];
    expect(sibling?.description).toContain("Button variants");
    expect(sibling?.paths).toEqual(["packages/geist/src/Button/**"]);
    expect(sibling).not.toHaveProperty("prose");
    expect(sibling).not.toHaveProperty("body");
  });

  it("surfaces dead-paths and unreferenced-material gaps", async () => {
    const pkg = await loadValid();
    const fingerprint = await loadGhostFixture();
    // No Button files in the tree → buttons' globs are dead.
    const packet = buildIntegrityPacket(
      pkg,
      fingerprint,
      FILES.filter((f) => !f.includes("Button")),
    );

    const dead = packet.gaps.find((g) => g.kind === "dead-paths");
    expect(dead?.materials).toEqual(["buttons"]);

    // No check references buttons → unguarded against sprawl.
    const unreferenced = packet.gaps.find(
      (g) => g.kind === "unreferenced-material",
    );
    expect(unreferenced?.materials).toEqual(["buttons"]);
  });
});

describe("formatIntegrityPacket", () => {
  it("renders the map: glob pointers with match counts, no file lists", async () => {
    const pkg = await loadValid();
    const fingerprint = await loadGhostFixture();
    const packet = buildIntegrityPacket(pkg, fingerprint, FILES);
    const md = formatIntegrityPacket(packet);

    expect(md).toContain("# Haunt integrity");
    expect(md).toContain("`packages/geist/src/Modal/**` — 2 files");
    expect(md).toContain("`apps/site/components/overlays/**` — 1 file");
    // The map does not ship the territory: no embedded file paths.
    expect(md).not.toContain("Modal.tsx");
  });

  it("renders the preamble: two baselines, five axes, gaps stance, finding format", async () => {
    const pkg = await loadValid();
    const fingerprint = await loadGhostFixture();
    const packet = buildIntegrityPacket(pkg, fingerprint, FILES);
    const md = formatIntegrityPacket(packet);

    expect(md).toContain("two baselines");
    expect(md).toContain("name the pattern it breaks");
    expect(md).toContain("contract");
    expect(md).toContain("naming coherence");
    expect(md).toContain("token discipline");
    expect(md).toContain("variant proliferation");
    expect(md).toContain("pattern forks");
    expect(md).toContain("Do not grade what no check covers");
    expect(md).toContain("P0");
    expect(md).toContain("Group findings **per material**");
    expect(md).toContain("Siblings (pointers");
    expect(md).toContain("Fingerprint-only checks");
  });
});
