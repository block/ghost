import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const hasBuiltExports = existsSync(
  resolve(REPO_ROOT, "packages/ghost/dist/package.js"),
);

describe.runIf(hasBuiltExports)("built public exports", () => {
  it("exposes the package API and deprecated fingerprint compatibility", async () => {
    const [packageApiModule, fingerprint, scan] = await Promise.all([
      import("@design-intelligence/ghost/package"),
      import("@design-intelligence/ghost/fingerprint"),
      import("@design-intelligence/ghost/scan"),
    ]);

    const packageApi = packageApiModule as Record<string, unknown>;
    const fingerprintApi = fingerprint as Record<string, unknown>;
    const scanApi = scan as Record<string, unknown>;

    expect(packageApi.initGhostPackage).toBeTypeOf("function");
    expect(packageApi.lintGhostPackage).toBeTypeOf("function");
    expect(packageApi.loadGhostPackage).toBeTypeOf("function");
    expect(packageApi.resolveGhostPackage).toBeTypeOf("function");
    expect(packageApi.GHOST_PACKAGE_SCHEMA).toBe("ghost.package/v1");

    expect(fingerprintApi.initFingerprintPackage).toBe(
      packageApi.initGhostPackage,
    );
    expect(fingerprintApi.lintFingerprintPackage).toBe(
      packageApi.lintGhostPackage,
    );
    expect(fingerprintApi.loadFingerprintPackage).toBe(
      packageApi.loadGhostPackage,
    );
    // Direct fingerprint.md loading was removed with compare/drift/fleet.
    expect(fingerprintApi.loadFingerprint).toBeUndefined();
    expect(fingerprintApi.writePackageContextBundle).toBeUndefined();
    expect(fingerprintApi.writeContextBundle).toBeUndefined();

    expect(scanApi.scanStatus).toBeUndefined();
    expect(scanApi.signals).toBeUndefined();
    expect(scanApi.loadFingerprintStackForPath).toBeUndefined();
    expect(scanApi.initFingerprintPackage).toBeUndefined();
    expect(scanApi.lintFingerprintPackage).toBeUndefined();
    expect(scanApi.writePackageContextBundle).toBeUndefined();
  });

  it("exposes the source-ref parser from the core subpath", async () => {
    const core = (await import("@design-intelligence/ghost/core")) as Record<
      string,
      unknown
    >;

    expect(core.parseSourceRef).toBeTypeOf("function");
    expect(core.sliceNodeSection).toBeTypeOf("function");
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
