import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadFingerprint } from "../src/fingerprint/load.js";
import { validateHauntGraph } from "../src/graph/validate.js";
import { loadHauntPackage } from "../src/scan/load-package.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => join(here, "fixtures", name);

async function loadOrThrow(name: string) {
  const { pkg } = await loadHauntPackage(fixture(name));
  if (!pkg) throw new Error(`fixture ${name} failed to load`);
  return pkg;
}

async function loadGhostFixture() {
  const fingerprint = await loadFingerprint({ ghostDir: fixture("ghost") });
  if (!fingerprint) throw new Error("ghost fixture failed to load");
  return fingerprint;
}

describe("validateHauntGraph", () => {
  it("passes local + resolvable fingerprint references with a fingerprint present", async () => {
    const pkg = await loadOrThrow("valid");
    const fingerprint = await loadGhostFixture();
    const report = validateHauntGraph(pkg, fingerprint);
    expect(report.errors).toBe(0);
    expect(report.warnings).toBe(0);
    expect(report.info).toBe(0);
  });

  it("warns when a fingerprint reference does not resolve in the catalog", async () => {
    const pkg = await loadOrThrow("danglers");
    const fingerprint = await loadGhostFixture();
    const report = validateHauntGraph(pkg, fingerprint);
    const dangling = report.issues.find(
      (i) => i.rule === "reference/fingerprint-unresolved",
    );
    expect(dangling?.severity).toBe("warning");
    expect(dangling?.where).toBe("checks/points-at-missing-node.references");
    expect(report.errors).toBe(0);
  });

  it("emits an info note (not an error) when no fingerprint resolves", async () => {
    const pkg = await loadOrThrow("valid");
    const report = validateHauntGraph(pkg, null);
    const info = report.issues.find(
      (i) => i.rule === "reference/no-fingerprint",
    );
    expect(info?.severity).toBe("info");
    expect(report.errors).toBe(0);
  });

  it("warns on inventory without paths", async () => {
    const pkg = await loadOrThrow("danglers");
    const report = validateHauntGraph(pkg, null);
    expect(report.issues.some((i) => i.rule === "inventory/no-paths")).toBe(
      true,
    );
  });
});
