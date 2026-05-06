import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Survey, SurveySource } from "@ghost/core";
import { tokenRowId, uiSurfaceRowId, valueRowId } from "@ghost/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { verifyProfile } from "../../src/core/index.js";

const SOURCE: SurveySource = {
  id: "local",
  role: "primary",
  target: "local",
  commit: "abc123",
  scanned_at: "2026-05-04T00:00:00Z",
};

function fingerprint({
  brand = "#1a1a1a",
  background = "#ffffff",
  neutralSteps = ["#ffffff", "#1a1a1a"],
  checks = "[]",
}: {
  brand?: string;
  background?: string;
  neutralSteps?: string[];
  checks?: string;
} = {}): string {
  return `---
id: local
source: llm
timestamp: 2026-05-04T00:00:00.000Z
checks: ${checks}
palette:
  dominant:
    - { role: background, value: "${background}" }
  neutrals:
    steps: [${neutralSteps.map((step) => `"${step}"`).join(", ")}]
    count: ${neutralSteps.length}
  semantic:
    - { role: brand, value: "${brand}" }
  saturationProfile: muted
  contrast: high
spacing: { scale: [4, 8, 16], baseUnit: 4, regularity: 1 }
typography:
  families: ["Inter"]
  sizeRamp: [12, 16, 24]
  weightDistribution: { 400: 1 }
  lineHeightPattern: normal
surfaces:
  borderRadii: [4, 8]
  shadowComplexity: deliberate-none
  borderUsage: minimal
---

# Character

Quiet and direct.

# Signature

Compact control surfaces with restrained color.

# Decisions

### color-strategy
Use a spare palette anchored by the surveyed brand and neutral values.
`;
}

function checkYaml({
  pattern = "#1a1a1a",
  observedCount = 1,
  support = 1,
  paths = ["src"],
  contexts = ["className"],
}: {
  pattern?: string;
  observedCount?: number;
  support?: number;
  paths?: string[];
  contexts?: string[];
} = {}): string {
  return `
  - id: brand-color
    canonical: palette-emphasis
    kind: color
    pattern: "${pattern.replace(/"/g, '\\"')}"
    paths: [${paths.map((entry) => `"${entry}"`).join(", ")}]
    contexts: [${contexts.map((entry) => `"${entry}"`).join(", ")}]
    observed_count: ${observedCount}
    support: ${support}
`;
}

function makeSurvey({
  colors = ["#ffffff", "#1a1a1a"],
  tokens = { "--brand": "#1a1a1a" },
}: {
  colors?: string[];
  tokens?: Record<string, string>;
} = {}): Survey {
  return {
    schema: "ghost.survey/v2",
    sources: [SOURCE],
    values: [
      ...colors.map((color) => ({
        id: valueRowId(SOURCE, "color", color, color),
        source: SOURCE,
        kind: "color",
        value: color,
        raw: color,
        occurrences: 1,
        files_count: 1,
      })),
      ...[4, 8, 16].map((value) => ({
        id: valueRowId(SOURCE, "spacing", `${value}px`, `p-${value}`),
        source: SOURCE,
        kind: "spacing",
        value: `${value}px`,
        raw: `p-${value}`,
        spec: { scalar: value, unit: "px" },
        occurrences: 6,
        files_count: 2,
      })),
      ...[12, 16, 24].map((value) => ({
        id: valueRowId(SOURCE, "typography", `${value}px`, `text-${value}`),
        source: SOURCE,
        kind: "typography",
        value: `${value}px`,
        raw: `text-${value}`,
        spec: { size: { scalar: value, unit: "px" } },
        occurrences: 6,
        files_count: 2,
      })),
      {
        id: valueRowId(SOURCE, "typography", "Inter", "font-inter"),
        source: SOURCE,
        kind: "typography",
        value: "Inter",
        raw: "font-inter",
        spec: { family: "Inter" },
        occurrences: 6,
        files_count: 2,
      },
      {
        id: valueRowId(SOURCE, "typography", "400", "font-normal"),
        source: SOURCE,
        kind: "typography",
        value: "400",
        raw: "font-normal",
        spec: { weight: 400 },
        occurrences: 6,
        files_count: 2,
      },
      ...[4, 8].map((value) => ({
        id: valueRowId(SOURCE, "radius", `${value}px`, `rounded-${value}`),
        source: SOURCE,
        kind: "radius",
        value: `${value}px`,
        raw: `rounded-${value}`,
        spec: { scalar: value, unit: "px" },
        occurrences: 6,
        files_count: 2,
      })),
    ],
    tokens: Object.entries(tokens).map(([name, value]) => ({
      id: tokenRowId(SOURCE, name),
      source: SOURCE,
      name,
      alias_chain: [],
      resolved_value: value,
      occurrences: 1,
    })),
    components: [],
    ui_surfaces: [
      {
        id: uiSurfaceRowId(SOURCE, "Settings", "route", "/settings"),
        source: SOURCE,
        name: "Settings",
        kind: "route",
        locator: "/settings",
        renderability: "source-only",
        files: ["src/settings.tsx"],
        signals: { layout_patterns: ["control-surface"] },
      },
    ],
  };
}

describe("verifyProfile", () => {
  let dir: string;

  beforeEach(async () => {
    dir = join(
      tmpdir(),
      `ghost-fingerprint-verify-profile-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await mkdir(dir, { recursive: true });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("passes when all palette colors exist in survey values or tokens", () => {
    const report = verifyProfile(
      fingerprint(),
      makeSurvey({ colors: ["#ffffff"], tokens: { "--brand": "#1a1a1a" } }),
    );

    expect(report.errors).toBe(0);
    expect(report.issues.some((issue) => issue.severity === "error")).toBe(
      false,
    );
  });

  it("errors when the fingerprint invents a palette color", () => {
    const report = verifyProfile(
      fingerprint({ brand: "#1c1c1c", neutralSteps: ["#ffffff", "#1a1a1a"] }),
      makeSurvey(),
    );

    expect(report.errors).toBeGreaterThan(0);
    expect(report.issues).toContainEqual(
      expect.objectContaining({
        severity: "error",
        rule: "palette-color-not-in-survey",
        path: "palette.semantic[0].value",
        actual: "#1c1c1c",
      }),
    );
  });

  it("warns when a same-role fingerprint palette entry disagrees with a high-salience token", () => {
    const report = verifyProfile(
      fingerprint({ brand: "#ffffff" }),
      makeSurvey({ colors: ["#ffffff", "#1a1a1a"] }),
    );

    expect(report.errors).toBe(0);
    expect(report.issues).toContainEqual(
      expect.objectContaining({
        severity: "warning",
        rule: "palette-role-token-mismatch",
        path: "palette.semantic[0].value",
        expected: "#1a1a1a",
        actual: "#ffffff",
      }),
    );
  });

  it("passes with empty checks", () => {
    const report = verifyProfile(fingerprint({ checks: "[]" }), makeSurvey());

    expect(report.errors).toBe(0);
  });

  it("errors when spacing, typography, or radii are not survey-backed", () => {
    const report = verifyProfile(
      fingerprint()
        .replace("scale: [4, 8, 16]", "scale: [4, 10, 16]")
        .replace('families: ["Inter"]', 'families: ["Aspirational Sans"]')
        .replace("sizeRamp: [12, 16, 24]", "sizeRamp: [12, 18, 24]")
        .replace(
          "weightDistribution: { 400: 1 }",
          "weightDistribution: { 500: 1 }",
        )
        .replace("borderRadii: [4, 8]", "borderRadii: [4, 12]"),
      makeSurvey(),
    );

    const rules = report.issues.map((issue) => issue.rule);
    expect(rules).toContain("spacing-value-not-in-survey");
    expect(rules).toContain("typography-family-not-in-survey");
    expect(rules).toContain("typography-size-not-in-survey");
    expect(rules).toContain("typography-weight-not-in-survey");
    expect(rules).toContain("radius-value-not-in-survey");
    expect(report.errors).toBeGreaterThanOrEqual(5);
  });

  it("errors when shadow posture disagrees with survey shadow evidence", () => {
    const survey = makeSurvey();
    survey.values.push({
      id: valueRowId(SOURCE, "shadow", "0 1px 2px #00000033", "shadow-sm"),
      source: SOURCE,
      kind: "shadow",
      value: "0 1px 2px #00000033",
      raw: "shadow-sm",
      occurrences: 8,
      files_count: 3,
    });

    const report = verifyProfile(fingerprint(), survey);

    expect(report.issues).toContainEqual(
      expect.objectContaining({
        severity: "error",
        rule: "shadow-posture-not-in-survey",
        path: "surfaces.shadowComplexity",
      }),
    );
  });

  it("warns when a high-salience survey value is omitted from the fingerprint", () => {
    const survey = makeSurvey();
    survey.values.push({
      id: valueRowId(SOURCE, "spacing", "32px", "gap-8"),
      source: SOURCE,
      kind: "spacing",
      value: "32px",
      raw: "gap-8",
      spec: { scalar: 32, unit: "px" },
      occurrences: 20,
      files_count: 4,
    });

    const report = verifyProfile(fingerprint(), survey);

    expect(report.errors).toBe(0);
    expect(report.issues).toContainEqual(
      expect.objectContaining({
        severity: "warning",
        rule: "survey-high-salience-value-omitted",
        actual: "32px",
      }),
    );
  });

  it("errors when a promoted check count does not match scoped regex hits", async () => {
    await mkdir(join(dir, "src"), { recursive: true });
    await writeFile(join(dir, "src", "settings.tsx"), 'color: "#1a1a1a";');

    const report = verifyProfile(
      fingerprint({ checks: checkYaml({ observedCount: 0 }) }),
      makeSurvey(),
      { root: dir },
    );

    expect(report.issues).toContainEqual(
      expect.objectContaining({
        severity: "error",
        rule: "check-observed-count-mismatch",
        path: "checks[0].observed_count",
        expected: 0,
        actual: 1,
      }),
    );
  });

  it("handles invalid regex patterns as clear verifier errors", () => {
    const report = verifyProfile(
      fingerprint({ checks: checkYaml({ pattern: "[" }) }),
      makeSurvey(),
    );

    expect(report.issues).toContainEqual(
      expect.objectContaining({
        severity: "error",
        rule: "check-pattern-invalid",
        path: "checks[0].pattern",
      }),
    );
  });

  it("catches the Goose2 first-pass palette regression fixture", async () => {
    const fixtureDir = dirname(fileURLToPath(import.meta.url));
    const fingerprintRaw = await readFile(
      join(
        fixtureDir,
        "..",
        "fixtures",
        "profile-verifier",
        "goose2",
        "fingerprint.md",
      ),
      "utf-8",
    );
    const survey = JSON.parse(
      await readFile(
        join(
          fixtureDir,
          "..",
          "fixtures",
          "profile-verifier",
          "goose2",
          "survey.json",
        ),
        "utf-8",
      ),
    );

    const report = verifyProfile(fingerprintRaw, survey);

    expect(report.issues).toContainEqual(
      expect.objectContaining({
        severity: "error",
        rule: "palette-color-not-in-survey",
        actual: "#1c1c1c",
      }),
    );
  });
});
