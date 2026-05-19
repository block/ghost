import type { Dirent } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import {
  GHOST_CHECKS_FILENAME,
  lintGhostChecks,
  lintGhostDecision,
  lintGhostPatterns,
  lintGhostProposal,
  lintGhostResources,
  lintSurvey,
  MAP_FILENAME,
  type MapFrontmatter,
  MapFrontmatterSchema,
  SURVEY_FILENAME,
} from "#ghost-core";
import {
  DECISIONS_DIRNAME,
  FINGERPRINT_FILENAME,
  FINGERPRINT_PACKAGE_DIR,
  INTENT_FILENAME,
  PATTERNS_FILENAME,
  PROPOSALS_DIRNAME,
  RESOURCES_FILENAME,
} from "./constants.js";
import type { LintIssue, LintReport } from "./lint.js";
import { lintMap } from "./lint-map.js";

export interface FingerprintPackagePaths {
  dir: string;
  resources: string;
  map: string;
  survey: string;
  patterns: string;
  /** Legacy direct markdown path; not part of the canonical root bundle. */
  fingerprint: string;
  checks: string;
  intent: string;
  decisions: string;
  proposals: string;
}

export interface InitFingerprintPackageOptions {
  withIntent?: boolean;
}

export function resolveFingerprintPackage(
  dirArg: string | undefined,
  cwd = process.cwd(),
): FingerprintPackagePaths {
  const dir = resolve(cwd, dirArg ?? FINGERPRINT_PACKAGE_DIR);
  return {
    dir,
    resources: join(dir, RESOURCES_FILENAME),
    map: join(dir, MAP_FILENAME),
    survey: join(dir, SURVEY_FILENAME),
    patterns: join(dir, PATTERNS_FILENAME),
    fingerprint: join(dir, FINGERPRINT_FILENAME),
    checks: join(dir, GHOST_CHECKS_FILENAME),
    intent: join(dir, INTENT_FILENAME),
    decisions: join(dir, DECISIONS_DIRNAME),
    proposals: join(dir, PROPOSALS_DIRNAME),
  };
}

export async function initFingerprintPackage(
  dirArg: string | undefined,
  cwd = process.cwd(),
  options: InitFingerprintPackageOptions = {},
): Promise<FingerprintPackagePaths> {
  const paths = resolveFingerprintPackage(dirArg, cwd);
  await mkdir(paths.dir, { recursive: true });
  const now = new Date().toISOString();
  await Promise.all([
    writeFile(paths.resources, templateResources(), "utf-8"),
    writeFile(paths.map, templateMap(now), "utf-8"),
    writeFile(paths.survey, templateSurvey(now), "utf-8"),
    writeFile(paths.patterns, templatePatterns(), "utf-8"),
    writeFile(paths.checks, templateChecks(), "utf-8"),
    ...(options.withIntent
      ? [writeFile(paths.intent, templateIntent(), "utf-8")]
      : []),
  ]);
  return paths;
}

export async function lintFingerprintPackage(
  dirArg: string | undefined,
  cwd = process.cwd(),
): Promise<LintReport> {
  const paths = resolveFingerprintPackage(dirArg, cwd);
  const issues: LintIssue[] = [];

  const resourcesRaw = await readRequired(
    paths.resources,
    "resources.yml",
    issues,
  );
  const mapRaw = await readRequired(paths.map, "map.md", issues);
  const surveyRaw = await readRequired(paths.survey, "survey.json", issues);
  const patternsRaw = await readRequired(
    paths.patterns,
    "patterns.yml",
    issues,
  );
  const checksRaw = await readOptional(paths.checks);
  const intentRaw = await readOptional(paths.intent);
  await lintMemoryDirectory(
    paths.decisions,
    "decisions",
    "decision",
    lintGhostDecision,
    issues,
  );
  await lintMemoryDirectory(
    paths.proposals,
    "proposals",
    "proposal",
    lintGhostProposal,
    issues,
  );

  if (resourcesRaw !== undefined) {
    const resources = parseYamlSafe(resourcesRaw, "resources.yml", issues);
    if (resources !== undefined) {
      const resourcesReport = lintGhostResources(resources);
      issues.push(...prefixIssues("resources.yml", resourcesReport.issues));
    }
  }

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

  if (patternsRaw !== undefined) {
    const patterns = parseYamlSafe(patternsRaw, "patterns.yml", issues);
    if (patterns !== undefined) {
      const patternsReport = lintGhostPatterns(patterns);
      issues.push(...prefixIssues("patterns.yml", patternsReport.issues));
    }
  }

  if (checksRaw !== undefined) {
    const checks = parseYamlSafe(checksRaw, "checks.yml", issues);
    if (checks !== undefined) {
      const checksReport = lintGhostChecks(checks, { map: mapFrontmatter });
      issues.push(...prefixIssues("checks.yml", checksReport.issues));
    }
  }

  if (intentRaw !== undefined && intentRaw.trim().length === 0) {
    issues.push({
      severity: "warning",
      rule: "intent-empty",
      message:
        "intent.md is optional, but when present it should contain human-authored or human-approved intent.",
      path: "intent.md",
    });
  }

  return finalize(issues);
}

async function lintMemoryDirectory(
  dirPath: string,
  label: "decisions" | "proposals",
  itemLabel: "decision" | "proposal",
  lint: (input: unknown) => ReturnType<typeof lintGhostDecision>,
  issues: LintIssue[],
): Promise<void> {
  let entries: Dirent[];
  try {
    entries = await readdir(dirPath, { withFileTypes: true });
  } catch {
    return;
  }

  const docs: Array<{ id: string; path: string }> = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (entry.name.startsWith(".")) continue;
    if (!/\.ya?ml$/i.test(entry.name)) continue;

    const relPath = `${label}/${entry.name}`;
    const raw = await readRequired(join(dirPath, entry.name), relPath, issues);
    if (raw === undefined) continue;
    const parsed = parseYamlSafe(raw, relPath, issues);
    if (parsed === undefined) continue;

    const report = lint(parsed);
    issues.push(...prefixIssues(relPath, report.issues));
    if (
      report.errors === 0 &&
      isRecord(parsed) &&
      typeof parsed.id === "string"
    ) {
      docs.push({ id: parsed.id, path: `${relPath}.id` });
    }
  }

  const seen = new Map<string, string>();
  for (const doc of docs) {
    const previous = seen.get(doc.id);
    if (previous) {
      issues.push({
        severity: "error",
        rule: `${itemLabel}-id-duplicate`,
        message: `${itemLabel} id '${doc.id}' is duplicated (also at ${previous})`,
        path: doc.path,
      });
    } else {
      seen.set(doc.id, doc.path);
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
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

async function readOptional(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, "utf-8");
  } catch {
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

function templateResources(): string {
  return `schema: ghost.resources/v1
id: local
primary:
  target: .
  paths:
    - .
design_system: []
surfaces: []
screenshots: []
docs: []
resolvers: []
upstreams: []
include:
  - "**/*"
exclude:
  - "**/node_modules/**"
`;
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

function templatePatterns(): string {
  return `schema: ghost.patterns/v1
id: local
surface_types: []
composition_patterns: []
advisory:
  review_expectations:
    - Cite survey evidence and pattern evidence for composition findings.
`;
}

function templateChecks(): string {
  return `schema: ghost.checks/v1
id: local
checks: []
`;
}

function templateIntent(): string {
  return `# Intent

This optional file is reserved for human-authored or human-approved product intent.
`;
}
