import type { Dirent } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import {
  GHOST_CHECKS_FILENAME,
  GHOST_FINGERPRINT_SCHEMA,
  type GhostFingerprintDocument,
  GhostFingerprintSchema,
  lintGhostChecks,
  lintGhostDecision,
  lintGhostFingerprint,
  lintGhostProposal,
  MAP_FILENAME,
  SURVEY_FILENAME,
} from "#ghost-core";
import {
  CACHE_DIRNAME,
  CONFIG_FILENAME,
  DECISIONS_DIRNAME,
  FINGERPRINT_FILENAME,
  FINGERPRINT_PACKAGE_DIR,
  FINGERPRINT_YML_FILENAME,
  INTENT_FILENAME,
  PATTERNS_FILENAME,
  PROPOSALS_DIRNAME,
  RESOURCES_FILENAME,
} from "./constants.js";
import type { LintIssue, LintReport } from "./lint.js";
import {
  lintGhostPackageConfig,
  normalizeReferenceInput,
  templatePackageConfig,
} from "./package-config.js";

export interface FingerprintPackagePaths {
  dir: string;
  fingerprintYml: string;
  config: string;
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
  cache: string;
}

export interface InitFingerprintPackageOptions {
  withIntent?: boolean;
  withConfig?: boolean;
  reference?: string;
}

export function resolveFingerprintPackage(
  dirArg: string | undefined,
  cwd = process.cwd(),
): FingerprintPackagePaths {
  const dir = resolve(cwd, dirArg ?? FINGERPRINT_PACKAGE_DIR);
  return {
    dir,
    fingerprintYml: join(dir, FINGERPRINT_YML_FILENAME),
    config: join(dir, CONFIG_FILENAME),
    resources: join(dir, RESOURCES_FILENAME),
    map: join(dir, MAP_FILENAME),
    survey: join(dir, SURVEY_FILENAME),
    patterns: join(dir, PATTERNS_FILENAME),
    fingerprint: join(dir, FINGERPRINT_FILENAME),
    checks: join(dir, GHOST_CHECKS_FILENAME),
    intent: join(dir, INTENT_FILENAME),
    decisions: join(dir, DECISIONS_DIRNAME),
    proposals: join(dir, PROPOSALS_DIRNAME),
    cache: join(dir, CACHE_DIRNAME),
  };
}

export async function initFingerprintPackage(
  dirArg: string | undefined,
  cwd = process.cwd(),
  options: InitFingerprintPackageOptions = {},
): Promise<FingerprintPackagePaths> {
  const paths = resolveFingerprintPackage(dirArg, cwd);
  await mkdir(paths.dir, { recursive: true });
  await Promise.all([
    mkdir(paths.proposals, { recursive: true }),
    mkdir(paths.cache, { recursive: true }),
    writeFile(
      paths.fingerprintYml,
      templateFingerprintYml(options.reference),
      "utf-8",
    ),
    writeFile(paths.checks, templateChecks(), "utf-8"),
    ...(options.withConfig
      ? [
          writeFile(
            paths.config,
            templatePackageConfig(options.reference),
            "utf-8",
          ),
        ]
      : []),
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

  const fingerprintRaw = await readRequired(
    paths.fingerprintYml,
    "fingerprint.yml",
    issues,
  );
  const configRaw = await readOptional(paths.config);
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

  let fingerprint: GhostFingerprintDocument | undefined;
  if (fingerprintRaw !== undefined) {
    const parsed = parseYamlSafe(fingerprintRaw, "fingerprint.yml", issues);
    if (parsed !== undefined) {
      const fingerprintReport = lintGhostFingerprint(parsed);
      issues.push(...prefixIssues("fingerprint.yml", fingerprintReport.issues));
      const result = GhostFingerprintSchema.safeParse(parsed);
      fingerprint = result.success
        ? (result.data as GhostFingerprintDocument)
        : undefined;
    }
  }

  if (configRaw !== undefined) {
    const config = parseYamlSafe(configRaw, "config.yml", issues);
    if (config !== undefined) {
      const configReport = lintGhostPackageConfig(config);
      issues.push(...prefixIssues("config.yml", configReport.issues));
    }
  }

  if (checksRaw !== undefined) {
    const checks = parseYamlSafe(checksRaw, "checks.yml", issues);
    if (checks !== undefined) {
      const checksReport = lintGhostChecks(checks, { fingerprint });
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

function templateFingerprintYml(reference?: string): string {
  const referenceInput = reference
    ? normalizeReferenceInput(reference)
    : undefined;
  const implementationVocabulary = referenceInput
    ? `implementation_vocabulary:
  libraries:
    - ${referenceInput.id}
  notes:
    - Product experience memory is intentionally blank until human-authored or human-approved.
`
    : "implementation_vocabulary: {}\n";

  return `schema: ${GHOST_FINGERPRINT_SCHEMA}
summary: {}
topology: {}
situations: []
principles: []
experience_contracts: []
patterns: []
${implementationVocabulary}review_policy:
  proposal_policy:
    - Agents create proposals for missing memory, intentional divergences, experience gaps, and check candidates.
    - Humans promote durable memory into fingerprint.yml and checks.yml.
  experience_gap_categories:
    - missing-memory
    - intentional-divergence
    - experience-gap
    - check-candidate
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
