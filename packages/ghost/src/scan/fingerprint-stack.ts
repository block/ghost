import { execFile } from "node:child_process";
import type { Dirent } from "node:fs";
import { access, mkdir, readdir, stat } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import {
  type GhostFingerprintDocument,
  type GhostFingerprintEvidence,
  lintGhostFingerprint,
} from "#ghost-core";
import type { PackageContext } from "../context/package-context.js";
import { readOptionalUtf8 } from "../internal/fs.js";
import {
  FINGERPRINT_MANIFEST_FILENAME,
  FINGERPRINT_PACKAGE_DIR,
} from "./constants.js";
import type { FingerprintPackagePaths } from "./fingerprint-package.js";
import {
  lintFingerprintPackage,
  loadFingerprintPackage,
  resolveFingerprintPackage,
} from "./fingerprint-package.js";
import type { LintIssue, LintReport } from "./lint.js";
import type {
  VerifyFingerprintIssue,
  VerifyFingerprintReport,
} from "./verify-fingerprint.js";
import { verifyFingerprintPackage } from "./verify-package.js";

const execFileAsync = promisify(execFile);

const BASE_SKIP_DISCOVERY_DIRS = new Set([
  ".git",
  ".ghost",
  "node_modules",
  "dist",
  "dist-lib",
  "build",
  ".next",
  ".turbo",
  "coverage",
]);

export interface FingerprintDirectoryOptions {
  ghostDir?: string;
}

export interface GhostFingerprintStackLayerRef {
  dir: string;
  root: string;
  relative_root: string;
  ghost_dir: string;
}

export interface GhostFingerprintStackLayer
  extends GhostFingerprintStackLayerRef {
  fingerprint: GhostFingerprintDocument;
  fingerprint_raw: string;
}

export interface GhostFingerprintStack {
  target_path: string;
  repo_root: string;
  ghost_dir: string;
  layers: GhostFingerprintStackLayer[];
  /**
   * The single source of truth for a path: the root contract's fingerprint and
   * checks, used as-is. Nesting binds paths to surfaces (ghost.binding/v1); it
   * no longer merges facets (the retired `child-wins-by-id` model). One
   * contract, many bindings.
   */
  contract: {
    /** Directory of the contract package (the root-most discovered package). */
    dir: string;
    fingerprint: GhostFingerprintDocument;
  };
  provenance: {
    layers: GhostFingerprintStackLayerRef[];
  };
}

export interface GhostFingerprintStackGroup {
  key: string;
  changed_files: string[];
  stack: GhostFingerprintStack;
}

export interface DiscoveredGhostPackage {
  dir: string;
  root: string;
  relative_root: string;
  ghost_dir: string;
}

export async function resolveGitRoot(cwd = process.cwd()): Promise<string> {
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["rev-parse", "--show-toplevel"],
      {
        cwd,
      },
    );
    return resolve(stdout.trim());
  } catch {
    return resolve(cwd);
  }
}

export async function discoverGhostPackages(
  root = process.cwd(),
  options: FingerprintDirectoryOptions = {},
): Promise<DiscoveredGhostPackage[]> {
  const repoRoot = await resolveGitRoot(root);
  const ghostDir = normalizeGhostDir(options.ghostDir);
  const skipDirs = skipDiscoveryDirs(ghostDir);
  const packages: DiscoveredGhostPackage[] = [];

  async function walk(dir: string): Promise<void> {
    const packageDir = resolve(dir, ghostDir);
    if (await hasSplitFingerprintPackage(packageDir)) {
      packages.push(packageRef(packageDir, repoRoot, ghostDir));
    }

    let entries: Dirent<string>[];
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    await Promise.all(
      entries.map(async (entry) => {
        if (!entry.isDirectory()) return;
        if (skipDirs.has(entry.name)) return;
        await walk(resolve(dir, entry.name));
      }),
    );
  }

  await walk(repoRoot);
  return packages.sort((a, b) => a.dir.localeCompare(b.dir));
}

export async function discoverFingerprintStack(
  targetPath = ".",
  cwd = process.cwd(),
  options: FingerprintDirectoryOptions = {},
): Promise<{ target_path: string; repo_root: string; packages: string[] }> {
  const repoRoot = await resolveGitRoot(cwd);
  const ghostDir = normalizeGhostDir(options.ghostDir);
  const target = resolve(cwd, targetPath);
  let current = await startingDirectory(target);
  const packages: string[] = [];

  while (isWithinOrEqual(repoRoot, current)) {
    const packageDir = resolve(current, ghostDir);
    if (await hasSplitFingerprintPackage(packageDir)) {
      packages.push(packageDir);
    }
    if (current === repoRoot) break;
    current = dirname(current);
  }

  return {
    target_path: normalizeRelative(repoRoot, target),
    repo_root: repoRoot,
    packages: packages.reverse(),
  };
}

export async function loadFingerprintStackForPath(
  targetPath = ".",
  cwd = process.cwd(),
  options: FingerprintDirectoryOptions = {},
): Promise<GhostFingerprintStack> {
  const ghostDir = normalizeGhostDir(options.ghostDir);
  const discovered = await discoverFingerprintStack(targetPath, cwd, {
    ghostDir,
  });
  if (discovered.packages.length === 0) {
    throw new Error(
      `No ${ghostDir}/${FINGERPRINT_MANIFEST_FILENAME} found for ${targetPath}.`,
    );
  }

  const layers = await Promise.all(
    discovered.packages.map((dir) =>
      loadFingerprintStackLayer(dir, discovered.repo_root, ghostDir),
    ),
  );
  return buildFingerprintStack(
    discovered.target_path,
    discovered.repo_root,
    layers,
    ghostDir,
  );
}

export async function groupFingerprintStacksForPaths(
  paths: string[],
  cwd = process.cwd(),
  options: FingerprintDirectoryOptions = {},
): Promise<GhostFingerprintStackGroup[]> {
  const targets = paths.length > 0 ? paths : ["."];
  const ghostDir = normalizeGhostDir(options.ghostDir);
  const groups = new Map<string, GhostFingerprintStackGroup>();

  for (const path of targets) {
    const stack = await loadFingerprintStackForPath(path, cwd, { ghostDir });
    const key = stack.layers.map((layer) => layer.dir).join("|");
    const existing = groups.get(key);
    if (existing) {
      existing.changed_files.push(path);
    } else {
      groups.set(key, {
        key,
        changed_files: [path],
        stack,
      });
    }
  }

  return [...groups.values()];
}

export function buildFingerprintStack(
  targetPath: string,
  repoRoot: string,
  layers: GhostFingerprintStackLayer[],
  ghostDir = FINGERPRINT_PACKAGE_DIR,
): GhostFingerprintStack {
  const normalizedGhostDir = normalizeGhostDir(ghostDir);
  if (layers.length === 0) {
    throw new Error("Cannot build a Ghost fingerprint stack without layers.");
  }

  // One contract, many bindings: the root-most layer is the contract. Nesting
  // no longer merges facets — a nested package binds paths to surfaces, it does
  // not contribute its own fingerprint data (the retired child-wins-by-id
  // model; see docs/ideas/surface-binding.md).
  const contractLayer = layers[0];
  const fingerprint = contractLayer.fingerprint;

  return {
    target_path: targetPath,
    repo_root: repoRoot,
    ghost_dir: normalizedGhostDir,
    layers,
    contract: {
      dir: contractLayer.dir,
      fingerprint,
    },
    provenance: {
      layers: layers.map(layerRef),
    },
  };
}

export async function loadFingerprintStackLayer(
  packageDir: string,
  repoRoot: string,
  ghostDir = FINGERPRINT_PACKAGE_DIR,
): Promise<GhostFingerprintStackLayer> {
  const paths = resolveFingerprintPackage(packageDir, process.cwd());
  const normalizedGhostDir = normalizeGhostDir(ghostDir);
  const root = rootForFingerprintPackageDir(paths.dir, normalizedGhostDir);
  const loaded = await loadFingerprintPackage(paths);

  const fingerprint = normalizeFingerprintPaths(
    loaded.fingerprint,
    root,
    repoRoot,
  );

  return {
    ...packageRef(paths.dir, repoRoot, normalizedGhostDir),
    fingerprint,
    fingerprint_raw: stringifyYaml(fingerprint, { lineWidth: 0 }),
  };
}

export function fingerprintStackToPackageContext(
  stack: GhostFingerprintStack,
  nameOverride?: string,
  targetPaths: string[] = [stack.target_path],
): PackageContext {
  const name = sanitizeName(
    nameOverride ??
      stack.contract.fingerprint.intent.summary.product ??
      stack.layers.at(-1)?.relative_root ??
      "ghost-package",
  );
  return {
    name,
    packageDir: stack.contract.dir,
    targetPaths,
    stackDirs: stack.layers.map((layer) => layer.dir),
    fingerprint: stack.contract.fingerprint,
    fingerprintRaw: stringifyYaml(stack.contract.fingerprint, { lineWidth: 0 }),
  };
}

export async function lintAllFingerprintStacks(
  root = process.cwd(),
  options: FingerprintDirectoryOptions = {},
): Promise<LintReport> {
  const ghostDir = normalizeGhostDir(options.ghostDir);
  const packages = await discoverGhostPackages(root, { ghostDir });
  const issues: LintIssue[] = [];

  for (const pkg of packages) {
    const rawReport = await lintFingerprintPackage(pkg.dir, root);
    issues.push(
      ...prefixIssues(
        fingerprintPackageDisplayPath(pkg.relative_root, ghostDir),
        rawReport.issues,
      ),
    );
    if (rawReport.errors > 0) continue;

    let stack: GhostFingerprintStack;
    try {
      stack = await loadFingerprintStackForPath(pkg.root, root, { ghostDir });
    } catch (err) {
      issues.push({
        severity: "error",
        rule: "stack-merge-invalid",
        message: err instanceof Error ? err.message : String(err),
        path: fingerprintPackageDisplayPath(pkg.relative_root, ghostDir),
      });
      continue;
    }
    const fingerprintReport = lintGhostFingerprint(stack.contract.fingerprint);
    issues.push(
      ...prefixIssues(
        `${fingerprintPackageDisplayPath(pkg.relative_root, ghostDir)}/contract.fingerprint`,
        fingerprintReport.issues,
      ),
    );
  }

  return finalizeLint(issues);
}

export async function verifyAllFingerprintStacks(
  root = process.cwd(),
  options: FingerprintDirectoryOptions = {},
): Promise<VerifyFingerprintReport> {
  const ghostDir = normalizeGhostDir(options.ghostDir);
  const packages = await discoverGhostPackages(root, { ghostDir });
  const issues: VerifyFingerprintIssue[] = [];

  for (const pkg of packages) {
    const report = await verifyFingerprintPackage(pkg.dir, root, {
      root: pkg.root,
    });
    issues.push(
      ...report.issues.map((issue) => ({
        ...issue,
        path: issue.path
          ? `${fingerprintPackageDisplayPath(pkg.relative_root, ghostDir)}.${issue.path}`
          : fingerprintPackageDisplayPath(pkg.relative_root, ghostDir),
      })),
    );
    try {
      await loadFingerprintStackForPath(pkg.root, root, { ghostDir });
    } catch (err) {
      issues.push({
        severity: "error",
        rule: "stack-merge-invalid",
        message: err instanceof Error ? err.message : String(err),
        path: fingerprintPackageDisplayPath(pkg.relative_root, ghostDir),
      });
    }
  }

  return {
    issues,
    errors: issues.filter((issue) => issue.severity === "error").length,
    warnings: issues.filter((issue) => issue.severity === "warning").length,
    info: issues.filter((issue) => issue.severity === "info").length,
  };
}

export async function initScopedFingerprintPackage(
  scopePath: string,
  cwd = process.cwd(),
  options: {
    reference?: string;
    force?: boolean;
    ghostDir?: string;
  } = {},
): Promise<FingerprintPackagePaths> {
  const root = resolve(cwd, scopePath);
  await mkdir(root, { recursive: true });
  return resolveAndInit(root, options);
}

async function resolveAndInit(
  root: string,
  options: {
    reference?: string;
    force?: boolean;
    ghostDir?: string;
  },
): Promise<FingerprintPackagePaths> {
  const { initFingerprintPackage } = await import("./fingerprint-package.js");
  const { ghostDir, ...initOptions } = options;
  return initFingerprintPackage(normalizeGhostDir(ghostDir), root, initOptions);
}

function normalizeFingerprintPaths(
  input: GhostFingerprintDocument,
  baseRoot: string,
  repoRoot: string,
): GhostFingerprintDocument {
  const fingerprint = clone(input);
  fingerprint.inventory.exemplars = fingerprint.inventory.exemplars.map(
    (exemplar) => ({
      ...exemplar,
      path: normalizePath(exemplar.path, baseRoot, repoRoot),
    }),
  );
  fingerprint.intent.situations = fingerprint.intent.situations.map(
    (entry) => ({
      ...entry,
      evidence: normalizeFingerprintEvidence(
        entry.evidence,
        baseRoot,
        repoRoot,
      ),
    }),
  );
  fingerprint.intent.principles = fingerprint.intent.principles.map(
    (entry) => ({
      ...entry,
      evidence: normalizeFingerprintEvidence(
        entry.evidence,
        baseRoot,
        repoRoot,
      ),
    }),
  );
  fingerprint.intent.experience_contracts =
    fingerprint.intent.experience_contracts.map((entry) => ({
      ...entry,
      evidence: normalizeFingerprintEvidence(
        entry.evidence,
        baseRoot,
        repoRoot,
      ),
    }));
  fingerprint.composition.patterns = fingerprint.composition.patterns.map(
    (entry) => ({
      ...entry,
      evidence: normalizeFingerprintEvidence(
        entry.evidence,
        baseRoot,
        repoRoot,
      ),
    }),
  );
  return fingerprint;
}

function normalizeFingerprintEvidence(
  evidence: GhostFingerprintEvidence[] | undefined,
  baseRoot: string,
  repoRoot: string,
): GhostFingerprintEvidence[] | undefined {
  return evidence?.map((entry) =>
    entry.path
      ? { ...entry, path: normalizePath(entry.path, baseRoot, repoRoot) }
      : entry,
  );
}

function normalizePath(
  path: string,
  baseRoot: string,
  repoRoot: string,
): string {
  if (isRemoteReference(path)) return path;
  const absolute = isAbsolute(path) ? path : resolve(baseRoot, path);
  return normalizeRelative(repoRoot, absolute);
}

function normalizeRelative(root: string, path: string): string {
  const rel = relative(root, path).replaceAll(sep, "/");
  return rel || ".";
}

async function startingDirectory(target: string): Promise<string> {
  try {
    const s = await stat(target);
    return s.isDirectory() ? target : dirname(target);
  } catch {
    return dirname(target);
  }
}

function isWithinOrEqual(root: string, candidate: string): boolean {
  const rel = relative(root, candidate);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function hasSplitFingerprintPackage(
  packageDir: string,
): Promise<boolean> {
  return pathExists(resolve(packageDir, FINGERPRINT_MANIFEST_FILENAME));
}

function packageRef(
  dir: string,
  repoRoot: string,
  ghostDir: string,
): DiscoveredGhostPackage {
  const root = rootForFingerprintPackageDir(dir, ghostDir);
  return {
    dir,
    root,
    relative_root: normalizeRelative(repoRoot, root),
    ghost_dir: ghostDir,
  };
}

function layerRef(
  layer: GhostFingerprintStackLayer,
): GhostFingerprintStackLayerRef {
  return {
    dir: layer.dir,
    root: layer.root,
    relative_root: layer.relative_root,
    ghost_dir: layer.ghost_dir,
  };
}

export function normalizeGhostDir(ghostDir = FINGERPRINT_PACKAGE_DIR): string {
  const normalized = ghostDir
    .trim()
    .replaceAll("\\", "/")
    .replace(/\/+/g, "/")
    .replace(/\/$/g, "");
  if (!normalized) {
    throw new Error("GHOST_PACKAGE_DIR must not be empty");
  }
  if (
    isAbsolute(ghostDir) ||
    normalized.startsWith("/") ||
    /^[A-Za-z]:/.test(normalized)
  ) {
    throw new Error("GHOST_PACKAGE_DIR must be a relative directory path");
  }
  const segments = normalized.split("/");
  if (
    segments.some(
      (segment) => segment === "." || segment === ".." || segment === "",
    )
  ) {
    throw new Error(
      "GHOST_PACKAGE_DIR must not contain '.', '..', or empty path segments",
    );
  }
  return normalized;
}

export const GHOST_PACKAGE_DIR_ENV = "GHOST_PACKAGE_DIR";

export function resolveGhostDirDefault(
  explicitGhostDir?: unknown,
  env: NodeJS.ProcessEnv = process.env,
): string {
  return normalizeGhostDir(
    typeof explicitGhostDir === "string"
      ? explicitGhostDir
      : env[GHOST_PACKAGE_DIR_ENV],
  );
}

export function fingerprintPackageDisplayPath(
  relativeRoot: string,
  ghostDir = FINGERPRINT_PACKAGE_DIR,
): string {
  const normalizedGhostDir = normalizeGhostDir(ghostDir);
  return relativeRoot === "."
    ? normalizedGhostDir
    : `${relativeRoot}/${normalizedGhostDir}`;
}

function skipDiscoveryDirs(ghostDir: string): Set<string> {
  return new Set([
    ...BASE_SKIP_DISCOVERY_DIRS,
    normalizeGhostDir(ghostDir).split("/")[0],
  ]);
}

function rootForFingerprintPackageDir(
  packageDir: string,
  ghostDir: string,
): string {
  let root = packageDir;
  for (const _segment of normalizeGhostDir(ghostDir).split("/")) {
    root = dirname(root);
  }
  return root;
}

const _readOptional = readOptionalUtf8;

function _parseYamlSafe(raw: string, label: string): unknown {
  try {
    return parseYaml(raw);
  } catch (err) {
    throw new Error(
      `${label} is not valid YAML: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}

function prefixIssues(
  label: string,
  issues: Array<{
    severity: "error" | "warning" | "info";
    rule: string;
    message: string;
    path?: string;
  }>,
): LintIssue[] {
  return issues.map((issue) => ({
    ...issue,
    path: issue.path ? `${label}.${issue.path}` : label,
  }));
}

function finalizeLint(issues: LintIssue[]): LintReport {
  return {
    issues,
    errors: issues.filter((issue) => issue.severity === "error").length,
    warnings: issues.filter((issue) => issue.severity === "warning").length,
    info: issues.filter((issue) => issue.severity === "info").length,
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function sanitizeName(value: string): string {
  const name = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return name || "ghost-package";
}

function isRemoteReference(reference: string): boolean {
  return /^https?:\/\//i.test(reference);
}
