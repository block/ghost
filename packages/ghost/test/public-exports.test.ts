import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const hasBuiltExports = existsSync(
  resolve(REPO_ROOT, "packages/ghost/dist/fingerprint.js"),
);

describe.runIf(hasBuiltExports)("built public exports", () => {
  it("exposes fingerprint-first package subpaths", async () => {
    const [fingerprint, scan] = await Promise.all([
      import("@anarchitecture/ghost/fingerprint"),
      import("@anarchitecture/ghost/scan"),
    ]);

    const fingerprintApi = fingerprint as Record<string, unknown>;
    const scanApi = scan as Record<string, unknown>;

    expect(fingerprintApi.initFingerprintPackage).toBeTypeOf("function");
    expect(fingerprintApi.lintFingerprintPackage).toBeTypeOf("function");
    expect(fingerprintApi.verifyFingerprintPackage).toBeTypeOf("function");
    // Direct fingerprint.md loading was removed with compare/drift/fleet.
    expect(fingerprintApi.loadFingerprint).toBeUndefined();
    expect(fingerprintApi.writePackageContextBundle).toBeUndefined();
    expect(fingerprintApi.writeContextBundle).toBeUndefined();

    expect(scanApi.scanStatus).toBeTypeOf("function");
    expect(scanApi.signals).toBeTypeOf("function");
    expect(scanApi.loadFingerprintStackForPath).toBeUndefined();
    expect(scanApi.initFingerprintPackage).toBeUndefined();
    expect(scanApi.lintFingerprintPackage).toBeUndefined();
    expect(scanApi.writePackageContextBundle).toBeUndefined();
  });
});
