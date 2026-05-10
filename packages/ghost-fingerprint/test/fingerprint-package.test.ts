import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  initFingerprintPackage,
  lintFingerprintPackage,
  resolveFingerprintPackage,
  verifyFingerprintPackage,
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

  it("discovers .ghost by default", () => {
    const paths = resolveFingerprintPackage(undefined, dir);

    expect(paths.dir).toBe(join(dir, ".ghost"));
    expect(paths.resources).toBe(join(paths.dir, "resources.yml"));
    expect(paths.patterns).toBe(join(paths.dir, "patterns.yml"));
    expect(paths.checks).toBe(join(paths.dir, "checks.yml"));
  });

  it("lints package artifacts together when checks are present", async () => {
    await initFingerprintPackage(undefined, dir);

    const report = await lintFingerprintPackage(undefined, dir);

    expect(report.errors).toBe(0);
  });

  it("passes package lint when optional checks.yml is absent", async () => {
    const paths = await initFingerprintPackage(undefined, dir);
    await rm(paths.checks, { force: true });

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

  it("verifies patterns against survey evidence", async () => {
    const paths = await initFingerprintPackage(undefined, dir);
    await writeFile(
      paths.survey,
      JSON.stringify({
        schema: "ghost.survey/v2",
        sources: [{ target: ".", scanned_at: "2026-05-10T00:00:00Z" }],
        values: [],
        tokens: [],
        components: [],
        ui_surfaces: [
          {
            id: "surface_settings",
            source: { target: ".", scanned_at: "2026-05-10T00:00:00Z" },
            name: "Settings",
            kind: "route",
            locator: "/settings",
            renderability: "source-only",
            files: ["src/settings.tsx"],
            classification: { surface_type: "settings" },
            signals: { layout_patterns: ["sectioned-form"] },
          },
        ],
      }),
    );
    await writeFile(
      paths.patterns,
      `schema: ghost.patterns/v1
id: local
surface_types:
  - id: settings
    preferred_patterns: [sectioned-form]
composition_patterns:
  - id: sectioned-form
    surface_types: [settings]
    evidence:
      - surface_id: surface_settings
`,
    );

    const report = await verifyFingerprintPackage(undefined, dir, {
      root: dir,
    });

    expect(report.errors).toBe(0);
  });
});
