import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const GHOST_PACKAGE_JSON = resolve(REPO_ROOT, "packages/ghost/package.json");
const hasBuiltExports = existsSync(
  resolve(REPO_ROOT, "packages/ghost/dist/package.js"),
);

describe("public package surface", () => {
  it("exposes exactly the supported package entrypoints", () => {
    const packageJson = JSON.parse(readFileSync(GHOST_PACKAGE_JSON, "utf8"));
    const exportKeys = Object.keys(packageJson.exports).sort();

    expect(exportKeys).toEqual([
      ".",
      "./cli",
      "./core",
      "./embed",
      "./package",
    ]);
    expect(exportKeys).not.toContain("./scan");
    expect(exportKeys).not.toContain("./fingerprint");
  });
});

describe.runIf(hasBuiltExports)("built public exports", () => {
  it("exposes the common package and embedded-host operations at the root", async () => {
    const root = (await import("@design-intelligence/ghost")) as Record<
      string,
      unknown
    >;

    for (const name of [
      "initGhostPackage",
      "lintGhostPackage",
      "loadGhostPackage",
      "resolveGhostPackage",
      "loadGhostSnapshot",
      "gatherGhostPackage",
      "pullGhostNodes",
      "inspectGhostMaterial",
    ]) {
      expect(root[name]).toBeTypeOf("function");
    }
    expect(root).not.toHaveProperty("embed");
    expect(root).not.toHaveProperty("ghostPackage");
  });

  it("exposes the package API", async () => {
    const packageApi = (await import(
      "@design-intelligence/ghost/package"
    )) as Record<string, unknown>;

    expect(packageApi.initGhostPackage).toBeTypeOf("function");
    expect(packageApi.lintGhostPackage).toBeTypeOf("function");
    expect(packageApi.loadGhostPackage).toBeTypeOf("function");
    expect(packageApi.resolveGhostPackage).toBeTypeOf("function");
    expect(packageApi.GHOST_PACKAGE_SCHEMA).toBe("ghost.package/v1");
    expect(packageApi.GHOST_PACKAGE_DIR_ENV).toBe("GHOST_PACKAGE_DIR");
  });

  it("exposes the check-reference parser from the core subpath", async () => {
    const core = (await import("@design-intelligence/ghost/core")) as Record<
      string,
      unknown
    >;

    expect(core.parseCheckReference).toBeTypeOf("function");
    expect(core.sliceNodeSection).toBeTypeOf("function");
    expect(core.materialLocator).toBeTypeOf("function");
    expect(core.normalizeMaterial).toBeTypeOf("function");
    expect(core.externalLocatorScheme).toBeTypeOf("function");
  });

  it("exposes the embedded host contract", async () => {
    const embed = (await import("@design-intelligence/ghost/embed")) as Record<
      string,
      unknown
    >;

    expect(embed.loadGhostSnapshot).toBeTypeOf("function");
    expect(embed.gatherGhostPackage).toBeTypeOf("function");
    expect(embed.pullGhostNodes).toBeTypeOf("function");
    expect(embed.inspectGhostMaterial).toBeTypeOf("function");
    expect(embed.stampGhostEvent).toBeTypeOf("function");
  });
});
