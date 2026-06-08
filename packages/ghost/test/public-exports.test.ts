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
    const [fingerprint, govern, compareApi] = await Promise.all([
      import("@anarchitecture/ghost/fingerprint"),
      import("@anarchitecture/ghost/govern"),
      import("@anarchitecture/ghost/compare"),
    ]);

    expect(fingerprint.initFingerprintPackage).toBeTypeOf("function");
    expect(fingerprint.lintFingerprintPackage).toBeTypeOf("function");
    expect(fingerprint.scanStatus).toBeTypeOf("function");

    expect(govern.runGhostCheck).toBeTypeOf("function");
    expect(govern.runGhostCheck).toBe(govern.runGhostDriftCheck);
    expect(govern.formatGhostCheckMarkdown).toBeTypeOf("function");
    expect(govern.formatGhostCheckMarkdown).toBe(
      govern.formatGhostDriftCheckMarkdown,
    );

    expect(compareApi.compare).toBeTypeOf("function");
    expect(compareApi.compareFingerprints).toBeTypeOf("function");
    expect(compareApi.formatComparison).toBeTypeOf("function");
  });
});
