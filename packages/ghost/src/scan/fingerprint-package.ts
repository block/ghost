import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import {
  GHOST_VALIDATE_FILENAME,
  type GhostFingerprintDocument,
  type GhostFingerprintPackageManifest,
  lintGhostValidate,
  MAP_FILENAME,
  SURVEY_FILENAME,
} from "#ghost-core";
import {
  isExistingPathError,
  isMissingPathError,
  readOptionalUtf8,
} from "../internal/fs.js";
import {
  FINGERPRINT_COMPOSITION_FILENAME,
  FINGERPRINT_FILENAME,
  FINGERPRINT_INTENT_FILENAME,
  FINGERPRINT_INVENTORY_FILENAME,
  FINGERPRINT_MANIFEST_FILENAME,
  FINGERPRINT_PACKAGE_DIR,
  FINGERPRINT_YML_FILENAME,
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
} from "./fingerprint-package-layers.js";
import type { LintIssue, LintReport } from "./lint.js";

export { loadFingerprintPackage } from "./fingerprint-package-layers.js";

export interface FingerprintPackagePaths {
  dir: string;
  packageDir: string;
  manifest: string;
  intent: string;
  inventory: string;
  composition: string;
  fingerprintYml: string;
  resources: string;
  map: string;
  survey: string;
  patterns: string;
  /** Legacy direct markdown path; not part of the canonical root bundle. */
  fingerprint: string;
  checks: string;
}

export interface LoadedFingerprintPackage {
  manifest: GhostFingerprintPackageManifest;
  manifestRaw: string;
  fingerprint: GhostFingerprintDocument;
  layerRaw: {
    intent?: string;
    inventory?: string;
    composition?: string;
  };
}

export interface InitFingerprintPackageOptions {
  reference?: string;
  force?: boolean;
}

export function resolveFingerprintPackage(
  dirArg: string | undefined,
  cwd = process.cwd(),
): FingerprintPackagePaths {
  const dir = resolve(cwd, dirArg ?? FINGERPRINT_PACKAGE_DIR);
  const packageDir = dir;
  return {
    dir,
    packageDir,
    manifest: join(packageDir, FINGERPRINT_MANIFEST_FILENAME),
    intent: join(packageDir, FINGERPRINT_INTENT_FILENAME),
    inventory: join(packageDir, FINGERPRINT_INVENTORY_FILENAME),
    composition: join(packageDir, FINGERPRINT_COMPOSITION_FILENAME),
    fingerprintYml: join(dir, FINGERPRINT_YML_FILENAME),
    resources: join(dir, RESOURCES_FILENAME),
    map: join(dir, MAP_FILENAME),
    survey: join(dir, SURVEY_FILENAME),
    patterns: join(dir, PATTERNS_FILENAME),
    fingerprint: join(dir, FINGERPRINT_FILENAME),
    checks: join(packageDir, GHOST_VALIDATE_FILENAME),
  };
}

export async function initFingerprintPackage(
  dirArg: string | undefined,
  cwd = process.cwd(),
  options: InitFingerprintPackageOptions = {},
): Promise<FingerprintPackagePaths> {
  const paths = resolveFingerprintPackage(dirArg, cwd);
  await mkdir(paths.packageDir, { recursive: true });
  const files = [
    { path: paths.manifest, content: templateManifest() },
    { path: paths.intent, content: templateIntent() },
    { path: paths.inventory, content: templateInventory(options.reference) },
    { path: paths.composition, content: templateComposition() },
    { path: paths.checks, content: templateChecks() },
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
    "manifest.yml",
    issues,
  );
  const intentRaw = await readOptional(paths.intent);
  const inventoryRaw = await readOptional(paths.inventory);
  const compositionRaw = await readOptional(paths.composition);
  const checksRaw = await readOptional(paths.checks);

  let fingerprint: GhostFingerprintDocument | undefined;
  if (manifestRaw !== undefined) {
    lintFingerprintPackageManifest(manifestRaw, issues);
    fingerprint = parseSplitFingerprintForLint(
      { intentRaw, inventoryRaw, compositionRaw },
      issues,
    );
  }

  if (checksRaw !== undefined) {
    const checks = parseYamlSafe(checksRaw, "validate.yml", issues);
    if (checks !== undefined) {
      const checksReport = lintGhostValidate(checks, { fingerprint });
      issues.push(...prefixIssues("validate.yml", checksReport.issues));
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
