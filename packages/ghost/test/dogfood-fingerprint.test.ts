import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { verifyFingerprintPackage } from "../src/scan/verify-package.js";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

describe("dogfood fingerprint", () => {
  it("keeps Ghost's own fingerprint evidence and exemplars reachable", async () => {
    const report = await verifyFingerprintPackage(".ghost", REPO_ROOT, {
      root: ".",
    });

    expect(report.issues).toEqual([]);
    expect(report.errors).toBe(0);
    expect(report.warnings).toBe(0);
  });
});
