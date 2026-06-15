import type { Dirent } from "node:fs";
import { access, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import {
  GHOST_CHECKS_FILENAME,
  type GhostFingerprintDocument,
  type GhostFingerprintPackageManifest,
  lintGhostChecks,
  lintGhostDecision,
  MAP_FILENAME,
  SURVEY_FILENAME,
} from "#ghost-core";
import {
  isExistingPathError,
  isMissingPathError,
  readOptionalUtf8,
} from "../internal/fs.js";
import {
  CACHE_DIRNAME,
  CONFIG_FILENAME,
  DECISIONS_DIRNAME,
  FINGERPRINT_COMPOSITION_FILENAME,
  FINGERPRINT_DIRNAME,
  FINGERPRINT_ENFORCEMENT_DIRNAME,
  FINGERPRINT_FILENAME,
  FINGERPRINT_INVENTORY_FILENAME,
  FINGERPRINT_MANIFEST_FILENAME,
  FINGERPRINT_MEMORY_DIRNAME,
  FINGERPRINT_PACKAGE_DIR,
  FINGERPRINT_PROSE_FILENAME,
  FINGERPRINT_SOURCES_DIRNAME,
  FINGERPRINT_YML_FILENAME,
  INTENT_FILENAME,
  PATTERNS_FILENAME,
  RESOURCES_FILENAME,
} from "./constants.js";
import {
  lintFingerprintPackageManifest,
  parseSplitFingerprintForLint,
  templateChecks,
  templateComposition,
  templateIntent,
  templateInventory,
  templateManifest,
  templateProse,
} from "./fingerprint-package-layers.js";
import type { LintIssue, LintReport } from "./lint.js";
import {
  lintGhostPackageConfig,
  templatePackageConfig,
} from "./package-config.js";

export { loadFingerprintPackage } from "./fingerprint-package-layers.js";

export interface FingerprintPackagePaths {
  dir: string;
  fingerprintDir: string;
  manifest: string;
  prose: string;
  inventory: string;
  composition: string;
  enforcement: string;
  fingerprintYml: string;
  config: string;
  resources: string;
  map: string;
  survey: string;
  patterns: string;
  /** Legacy direct markdown path; not part of the canonical root bundle. */
  fingerprint: string;
  checks: string;
  memory: string;
  intent: string;
  decisions: string;
  sources: string;
  cache: string;
}

export interface LoadedFingerprintPackage {
  manifest: GhostFingerprintPackageManifest;
  manifestRaw: string;
  fingerprint: GhostFingerprintDocument;
  layerRaw: {
    prose?: string;
    inventory?: string;
    composition?: string;
  };
}

export interface InitFingerprintPackageOptions {
  withIntent?: boolean;
  withConfig?: boolean;
  reference?: string;
  force?: boolean;
}

export function resolveFingerprintPackage(
  dirArg: string | undefined,
  cwd = process.cwd(),
): FingerprintPackagePaths {
  const dir = resolve(cwd, dirArg ?? FINGERPRINT_PACKAGE_DIR);
  const fingerprintDir = join(dir, FINGERPRINT_DIRNAME);
  const enforcement = join(fingerprintDir, FINGERPRINT_ENFORCEMENT_DIRNAME);
  const memory = join(fingerprintDir, FINGERPRINT_MEMORY_DIRNAME);
  const sources = join(fingerprintDir, FINGERPRINT_SOURCES_DIRNAME);
  return {
    dir,
    fingerprintDir,
    manifest: join(fingerprintDir, FINGERPRINT_MANIFEST_FILENAME),
    prose: join(fingerprintDir, FINGERPRINT_PROSE_FILENAME),
    inventory: join(fingerprintDir, FINGERPRINT_INVENTORY_FILENAME),
    composition: join(fingerprintDir, FINGERPRINT_COMPOSITION_FILENAME),
    enforcement,
    fingerprintYml: join(dir, FINGERPRINT_YML_FILENAME),
    config: join(dir, CONFIG_FILENAME),
    resources: join(dir, RESOURCES_FILENAME),
    map: join(dir, MAP_FILENAME),
    survey: join(dir, SURVEY_FILENAME),
    patterns: join(dir, PATTERNS_FILENAME),
    fingerprint: join(dir, FINGERPRINT_FILENAME),
    checks: join(enforcement, GHOST_CHECKS_FILENAME),
    memory,
    intent: join(memory, INTENT_FILENAME),
    decisions: join(memory, DECISIONS_DIRNAME),
    sources,
    cache: join(sources, CACHE_DIRNAME),
  };
}

export async function initFingerprintPackage(
  dirArg: string | undefined,
  cwd = process.cwd(),
  options: InitFingerprintPackageOptions = {},
): Promise<FingerprintPackagePaths> {
  const paths = resolveFingerprintPackage(dirArg, cwd);
  await Promise.all([
    mkdir(paths.fingerprintDir, { recursive: true }),
    mkdir(paths.enforcement, { recursive: true }),
    ...(options.withIntent ? [mkdir(paths.memory, { recursive: true })] : []),
    ...(options.withConfig ? [mkdir(paths.dir, { recursive: true })] : []),
  ]);
  const files = [
    { path: paths.manifest, content: templateManifest() },
    { path: paths.prose, content: templateProse() },
    { path: paths.inventory, content: templateInventory(options.reference) },
    { path: paths.composition, content: templateComposition() },
    { path: paths.checks, content: templateChecks() },
    ...(options.withConfig
      ? [
          {
            path: paths.config,
            content: templatePackageConfig(options.reference),
          },
        ]
      : []),
    ...(options.withIntent
      ? [{ path: paths.intent, content: templateIntent() }]
      : []),
  ];
  if (!options.force) {
    await assertInitDoesNotOverwrite(files.map((file) => file.path));
  }
  await Promise.all(
    files.map((file) => writeInitFile(file.path, file.content, options.force)),
  );
  return paths;
}

async function writeInitFile(
  path: string,
  content: string,
  force = false,
): Promise<void> {
  try {
    await writeFile(path, content, {
      encoding: "utf-8",
      flag: force ? "w" : "wx",
    });
  } catch (err) {
    if (!force && isExistingPathError(err)) {
      throw new Error(
        `Refusing to overwrite existing Ghost fingerprint file:\n  ${path}\nPass --force to overwrite.`,
      );
    }
    throw err;
  }
}

async function assertInitDoesNotOverwrite(paths: string[]): Promise<void> {
  const existing = [];
  for (const path of paths) {
    try {
      await access(path);
      existing.push(path);
    } catch (err) {
      if (isMissingPathError(err)) continue;
      throw err;
    }
  }
  if (existing.length > 0) {
    const formatted = existing.map((path) => `  ${path}`).join("\n");
    throw new Error(
      `Refusing to overwrite existing Ghost fingerprint file(s):\n${formatted}\nPass --force to overwrite.`,
    );
  }
}

export async function lintFingerprintPackage(
  dirArg: string | undefined,
  cwd = process.cwd(),
): Promise<LintReport> {
  const paths = resolveFingerprintPackage(dirArg, cwd);
  const issues: LintIssue[] = [];

  const manifestRaw = await readRequired(
    paths.manifest,
    "fingerprint/manifest.yml",
    issues,
  );
  const proseRaw = await readOptional(paths.prose);
  const inventoryRaw = await readOptional(paths.inventory);
  const compositionRaw = await readOptional(paths.composition);
  const configRaw = await readOptional(paths.config);
  const checksRaw = await readOptional(paths.checks);
  const intentRaw = await readOptional(paths.intent);
  await lintDecisionDirectory(
    paths.decisions,
    "fingerprint/memory/decisions",
    "decision",
    lintGhostDecision,
    issues,
  );

  let fingerprint: GhostFingerprintDocument | undefined;
  if (manifestRaw !== undefined) {
    lintFingerprintPackageManifest(manifestRaw, issues);
    fingerprint = parseSplitFingerprintForLint(
      { proseRaw, inventoryRaw, compositionRaw },
      issues,
    );
  }

  if (configRaw !== undefined) {
    const config = parseYamlSafe(configRaw, "config.yml", issues);
    if (config !== undefined) {
      const configReport = lintGhostPackageConfig(config);
      issues.push(...prefixIssues("config.yml", configReport.issues));
    }
  }

  if (checksRaw !== undefined) {
    const checks = parseYamlSafe(
      checksRaw,
      "fingerprint/enforcement/checks.yml",
      issues,
    );
    if (checks !== undefined) {
      const checksReport = lintGhostChecks(checks, { fingerprint });
      issues.push(
        ...prefixIssues(
          "fingerprint/enforcement/checks.yml",
          checksReport.issues,
        ),
      );
    }
  }

  if (intentRaw !== undefined && intentRaw.trim().length === 0) {
    issues.push({
      severity: "warning",
      rule: "intent-empty",
      message:
        "intent.md is optional, but when present it should contain human-authored or human-approved intent.",
      path: "fingerprint/memory/intent.md",
    });
  }

  return finalize(issues);
}

async function lintDecisionDirectory(
  dirPath: string,
  label: "fingerprint/memory/decisions",
  itemLabel: "decision",
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

const readOptional = readOptionalUtf8;

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
