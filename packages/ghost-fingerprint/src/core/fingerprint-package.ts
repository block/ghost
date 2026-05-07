import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
  GHOST_CHECKS_FILENAME,
  lintGhostChecks,
  lintSurvey,
  MAP_FILENAME,
  type MapFrontmatter,
  MapFrontmatterSchema,
  SURVEY_FILENAME,
} from "@ghost/core";
import { parse as parseYaml } from "yaml";
import { FINGERPRINT_PACKAGE_DIR, PROFILE_FILENAME } from "./constants.js";
import type { LintIssue, LintReport } from "./lint.js";
import { lintFingerprint } from "./lint.js";
import { lintMap } from "./lint-map.js";

export interface FingerprintPackagePaths {
  dir: string;
  map: string;
  survey: string;
  profile: string;
  checks: string;
}

export function resolveFingerprintPackage(
  dirArg: string | undefined,
  cwd = process.cwd(),
): FingerprintPackagePaths {
  const dir = resolve(cwd, dirArg ?? FINGERPRINT_PACKAGE_DIR);
  return {
    dir,
    map: join(dir, MAP_FILENAME),
    survey: join(dir, SURVEY_FILENAME),
    profile: join(dir, PROFILE_FILENAME),
    checks: join(dir, GHOST_CHECKS_FILENAME),
  };
}

export async function initFingerprintPackage(
  dirArg: string | undefined,
  cwd = process.cwd(),
): Promise<FingerprintPackagePaths> {
  const paths = resolveFingerprintPackage(dirArg, cwd);
  await mkdir(paths.dir, { recursive: true });
  const now = new Date().toISOString();
  await Promise.all([
    writeFile(paths.map, templateMap(now), "utf-8"),
    writeFile(paths.survey, templateSurvey(now), "utf-8"),
    writeFile(paths.profile, templateProfile(now), "utf-8"),
    writeFile(paths.checks, templateChecks(), "utf-8"),
  ]);
  return paths;
}

export async function lintFingerprintPackage(
  dirArg: string | undefined,
  cwd = process.cwd(),
): Promise<LintReport> {
  const paths = resolveFingerprintPackage(dirArg, cwd);
  const issues: LintIssue[] = [];

  const mapRaw = await readRequired(paths.map, "map.md", issues);
  const surveyRaw = await readRequired(paths.survey, "survey.json", issues);
  const profileRaw = await readRequired(paths.profile, "profile.md", issues);
  const checksRaw = await readRequired(paths.checks, "checks.yml", issues);

  let mapFrontmatter: MapFrontmatter | undefined;
  if (mapRaw !== undefined) {
    const mapReport = lintMap(mapRaw);
    issues.push(...prefixIssues("map.md", mapReport.issues));
    mapFrontmatter = parseMapFrontmatter(mapRaw, issues);
  }

  if (surveyRaw !== undefined) {
    const survey = parseJson(surveyRaw, "survey.json", issues);
    if (survey !== undefined) {
      const surveyReport = lintSurvey(survey);
      issues.push(...prefixIssues("survey.json", surveyReport.issues));
    }
  }

  if (profileRaw !== undefined) {
    const profileReport = lintFingerprint(profileRaw);
    issues.push(...prefixIssues("profile.md", profileReport.issues));
  }

  if (checksRaw !== undefined) {
    const checks = parseYamlSafe(checksRaw, "checks.yml", issues);
    if (checks !== undefined) {
      const checksReport = lintGhostChecks(checks, { map: mapFrontmatter });
      issues.push(...prefixIssues("checks.yml", checksReport.issues));
    }
  }

  return finalize(issues);
}

async function readRequired(
  path: string,
  label: string,
  issues: LintIssue[],
): Promise<string | undefined> {
  try {
    return await readFile(path, "utf-8");
  } catch {
    issues.push({
      severity: "error",
      rule: "package-artifact-missing",
      message: `Fingerprint package is missing ${label}.`,
      path: label,
    });
    return undefined;
  }
}

function parseJson(
  raw: string,
  label: string,
  issues: LintIssue[],
): unknown | undefined {
  try {
    return JSON.parse(raw);
  } catch (err) {
    issues.push({
      severity: "error",
      rule: "package-json-invalid",
      message: `${label} is not valid JSON: ${
        err instanceof Error ? err.message : String(err)
      }`,
      path: label,
    });
    return undefined;
  }
}

function parseYamlSafe(
  raw: string,
  label: string,
  issues: LintIssue[],
): unknown | undefined {
  try {
    return parseYaml(raw);
  } catch (err) {
    issues.push({
      severity: "error",
      rule: "package-yaml-invalid",
      message: `${label} is not valid YAML: ${
        err instanceof Error ? err.message : String(err)
      }`,
      path: label,
    });
    return undefined;
  }
}

function parseMapFrontmatter(
  raw: string,
  issues: LintIssue[],
): MapFrontmatter | undefined {
  const block = raw.match(/^---\n([\s\S]*?)\n---/)?.[1];
  if (!block) return undefined;
  const parsed = parseYamlSafe(block, "map.md", issues);
  const result = MapFrontmatterSchema.safeParse(parsed);
  return result.success ? result.data : undefined;
}

function prefixIssues(
  label: string,
  input: Array<{
    severity: "error" | "warning" | "info";
    rule: string;
    message: string;
    path?: string;
  }>,
): LintIssue[] {
  return input.map((issue) => ({
    severity: issue.severity,
    rule: issue.rule,
    message: issue.message,
    path: issue.path ? `${label}.${issue.path}` : label,
  }));
}

function finalize(issues: LintIssue[]): LintReport {
  return {
    issues,
    errors: issues.filter((issue) => issue.severity === "error").length,
    warnings: issues.filter((issue) => issue.severity === "warning").length,
    info: issues.filter((issue) => issue.severity === "info").length,
  };
}

function templateMap(now: string): string {
  return `---
schema: ghost.map/v2
id: local
repo: local
mapped_at: ${now}
platform: other
languages:
  - { name: unknown, files: 0, share: 0 }
build_system: other
package_manifests:
  - package.json
composition:
  frameworks:
    - { name: unknown }
  rendering: unknown
  styling:
    - unknown
design_system:
  paths: []
  status: unclear
surface_sources:
  render_strategy: unknown
  include:
    - "**/*"
  exclude:
    - "**/node_modules/**"
feature_areas:
  - name: app
    paths:
      - .
orientation_files:
  - README.md
---

## Identity

Local fingerprint package awaiting map authoring.

## Topology

The topology has not been mapped yet.

## Conventions

No conventions have been recorded yet.
`;
}

function templateSurvey(now: string): string {
  return `${JSON.stringify(
    {
      schema: "ghost.survey/v2",
      sources: [{ target: ".", scanned_at: now }],
      values: [],
      tokens: [],
      components: [],
      ui_surfaces: [],
    },
    null,
    2,
  )}\n`;
}

function templateProfile(now: string): string {
  return `---
id: local
source: unknown
timestamp: ${now}
palette:
  dominant: []
  neutrals: { steps: [], count: 0 }
  semantic: []
  saturationProfile: muted
  contrast: moderate
spacing: { scale: [], baseUnit: null, regularity: 0 }
typography:
  families: []
  sizeRamp: []
  weightDistribution: {}
  lineHeightPattern: normal
surfaces:
  borderRadii: []
  shadowComplexity: deliberate-none
  borderUsage: minimal
---

# Character

No design-language prior has been authored yet.

# Signature

No recognizable signature has been authored yet.

# Decisions
`;
}

function templateChecks(): string {
  return `schema: ghost.checks/v1
id: local
checks: []
`;
}
