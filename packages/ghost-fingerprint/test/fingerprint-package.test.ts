import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  initFingerprintPackage,
  lintFingerprintPackage,
  resolveFingerprintPackage,
} from "../src/core/index.js";

describe("fingerprint package", () => {
  let dir: string;

  beforeEach(async () => {
    dir = join(
      tmpdir(),
      `ghost-fingerprint-package-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await mkdir(dir, { recursive: true });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("discovers .ghost/fingerprint by default", () => {
    const paths = resolveFingerprintPackage(undefined, dir);

    expect(paths.dir).toBe(join(dir, ".ghost", "fingerprint"));
    expect(paths.profile).toBe(join(paths.dir, "profile.md"));
    expect(paths.checks).toBe(join(paths.dir, "checks.yml"));
  });

  it("lints all four package artifacts together", async () => {
    await initFingerprintPackage(undefined, dir);

    const report = await lintFingerprintPackage(undefined, dir);

    expect(report.errors).toBe(0);
  });

  it("fails package lint when checks reference unknown map scopes", async () => {
    const paths = await initFingerprintPackage(undefined, dir);
    await writeFile(
      paths.checks,
      `schema: ghost.checks/v1
id: local
checks:
  - id: no-hardcoded-ui-color
    title: Use design tokens for UI color
    status: active
    severity: serious
    applies_to:
      scopes: [missing-scope]
    detector:
      type: forbidden-regex
      pattern: '#[0-9a-fA-F]{3,8}'
    evidence:
      support: 0.94
      observed_count: 1
      examples:
        - src/Button.tsx
`,
    );

    const report = await lintFingerprintPackage(undefined, dir);

    expect(report.errors).toBeGreaterThan(0);
    expect(report.issues.map((issue) => issue.rule)).toContain(
      "check-scope-unknown",
    );
  });
});
