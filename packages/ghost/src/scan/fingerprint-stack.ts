import { execFile } from "node:child_process";
import type { Dirent } from "node:fs";
import { access, mkdir, readdir, stat } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import {
  GHOST_FINGERPRINT_SCHEMA,
  GHOST_VALIDATE_SCHEMA,
  type GhostCheck,
  type GhostFingerprintComposition,
  type GhostFingerprintDocument,
  type GhostFingerprintEvidence,
  type GhostFingerprintIntent,
  type GhostFingerprintInventory,
  type GhostFingerprintInventoryBuildingBlocks,
  type GhostFingerprintSummary,
  type GhostFingerprintTopology,
  type GhostFingerprintTopologyScope,
  type GhostValidateDocument,
  GhostValidateSchema,
  lintGhostFingerprint,
  lintGhostValidate,
  type MapFrontmatter,
} from "#ghost-core";
import type { PackageContext } from "../context/package-context.js";
import { readOptionalUtf8 } from "../internal/fs.js";
import {
  FINGERPRINT_DIRNAME,
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
  memoryDir?: string;
}

export interface GhostFingerprintStackLayerRef {
  dir: string;
  root: string;
  relative_root: string;
  fingerprint_dir: string;
}

export interface GhostFingerprintStackLayer
  extends GhostFingerprintStackLayerRef {
  fingerprint: GhostFingerprintDocument;
  fingerprint_raw: string;
  checks?: GhostValidateDocument;
  checks_raw?: string;
}

export interface GhostFingerprintStack {
  target_path: string;
  repo_root: string;
  fingerprint_dir: string;
  layers: GhostFingerprintStackLayer[];
  merged: {
    fingerprint: GhostFingerprintDocument;
    checks: GhostValidateDocument;
  };
  provenance: {
    merge: "child-wins-by-id";
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
  fingerprint_dir: string;
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
  const memoryDir = normalizeMemoryDir(options.memoryDir);
  const skipDirs = skipDiscoveryDirs(memoryDir);
  const packages: DiscoveredGhostPackage[] = [];

  async function walk(dir: string): Promise<void> {
    const packageDir = resolve(dir, memoryDir);
    if (await hasSplitFingerprintPackage(packageDir)) {
      packages.push(packageRef(packageDir, repoRoot, memoryDir));
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
  const memoryDir = normalizeMemoryDir(options.memoryDir);
  const target = resolve(cwd, targetPath);
  let current = await startingDirectory(target);
  const packages: string[] = [];

  while (isWithinOrEqual(repoRoot, current)) {
    const packageDir = resolve(current, memoryDir);
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
  const memoryDir = normalizeMemoryDir(options.memoryDir);
  const discovered = await discoverFingerprintStack(targetPath, cwd, {
    memoryDir,
  });
  if (discovered.packages.length === 0) {
    throw new Error(
      `No ${memoryDir}/${FINGERPRINT_DIRNAME}/${FINGERPRINT_MANIFEST_FILENAME} found for ${targetPath}.`,
    );
  }

  const layers = await Promise.all(
    discovered.packages.map((dir) =>
      loadFingerprintStackLayer(dir, discovered.repo_root, memoryDir),
    ),
  );
  return buildFingerprintStack(
    discovered.target_path,
    discovered.repo_root,
    layers,
    memoryDir,
  );
}

export async function groupFingerprintStacksForPaths(
  paths: string[],
  cwd = process.cwd(),
  options: FingerprintDirectoryOptions = {},
): Promise<GhostFingerprintStackGroup[]> {
  const targets = paths.length > 0 ? paths : ["."];
  const memoryDir = normalizeMemoryDir(options.memoryDir);
  const groups = new Map<string, GhostFingerprintStackGroup>();

  for (const path of targets) {
    const stack = await loadFingerprintStackForPath(path, cwd, { memoryDir });
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
  memoryDir = FINGERPRINT_PACKAGE_DIR,
): GhostFingerprintStack {
  const normalizedMemoryDir = normalizeMemoryDir(memoryDir);
  if (layers.length === 0) {
    throw new Error("Cannot build a Ghost fingerprint stack without layers.");
  }

  const fingerprint = mergeFingerprints(
    layers.map((layer) => layer.fingerprint),
  );
  const checks = mergeChecks(layers.map((layer) => layer.checks));
  const checkLint = lintGhostValidate(checks, {
    fingerprint,
    map: mapFromFingerprint(fingerprint),
  });
  if (checkLint.errors > 0) {
    throw new Error(
      `Merged checks failed lint with ${checkLint.errors} error(s): ${checkLint.issues
        .filter((issue) => issue.severity === "error")
        .map((issue) => `[${issue.rule}] ${issue.message}`)
        .join("; ")}`,
    );
  }

  return {
    target_path: targetPath,
    repo_root: repoRoot,
    fingerprint_dir: normalizedMemoryDir,
    layers,
    merged: {
      fingerprint,
      checks,
    },
    provenance: {
      merge: "child-wins-by-id",
      layers: layers.map(layerRef),
    },
  };
}

export async function loadFingerprintStackLayer(
  packageDir: string,
  repoRoot: string,
  memoryDir = FINGERPRINT_PACKAGE_DIR,
): Promise<GhostFingerprintStackLayer> {
  const paths = resolveFingerprintPackage(packageDir, process.cwd());
  const normalizedMemoryDir = normalizeMemoryDir(memoryDir);
  const root = rootForFingerprintPackageDir(paths.dir, normalizedMemoryDir);
  const [loaded, checksRaw] = await Promise.all([
    loadFingerprintPackage(paths),
    readOptional(paths.checks),
  ]);

  const fingerprint = normalizeFingerprintPaths(
    loaded.fingerprint,
    root,
    repoRoot,
  );
  const checks = checksRaw
    ? normalizeChecksPaths(parseChecks(checksRaw), root, repoRoot)
    : undefined;

  if (checks) {
    const checksReport = lintGhostValidate(checks);
    if (checksReport.errors > 0) {
      const first = checksReport.issues.find(
        (issue) => issue.severity === "error",
      );
      const suffix = first?.path ? ` @ ${first.path}` : "";
      throw new Error(
        `${paths.checks} failed checks lint: ${first?.message ?? "invalid checks"}${suffix}`,
      );
    }
  }

  return {
    ...packageRef(paths.dir, repoRoot, normalizedMemoryDir),
    fingerprint,
    fingerprint_raw: stringifyYaml(fingerprint, { lineWidth: 0 }),
    ...(checks ? { checks } : {}),
    ...(checksRaw ? { checks_raw: checksRaw } : {}),
  };
}

export function fingerprintStackToPackageContext(
  stack: GhostFingerprintStack,
  nameOverride?: string,
  targetPaths: string[] = [stack.target_path],
): PackageContext {
  const name = sanitizeName(
    nameOverride ??
      stack.merged.fingerprint.intent.summary.product ??
      stack.layers.at(-1)?.relative_root ??
      "ghost-package",
  );
  return {
    name,
    fingerprintDir: stack.fingerprint_dir,
    targetPaths,
    layerDirs: stack.layers.map((layer) => layer.dir),
    fingerprint: stack.merged.fingerprint,
    fingerprintRaw: stringifyYaml(stack.merged.fingerprint, { lineWidth: 0 }),
    checks: stack.merged.checks,
    checksRaw: stringifyYaml(stack.merged.checks, { lineWidth: 0 }),
  };
}

export function mapFromFingerprint(
  fingerprint: GhostFingerprintDocument,
): Pick<MapFrontmatter, "scopes" | "feature_areas"> {
  return {
    scopes: fingerprint.inventory.topology.scopes?.map((scope) => ({
      id: scope.id,
      name: scope.id,
      kind: "fingerprint-topology",
      paths: [...scope.paths],
    })),
    feature_areas: [],
  };
}

export async function lintAllFingerprintStacks(
  root = process.cwd(),
  options: FingerprintDirectoryOptions = {},
): Promise<LintReport> {
  const memoryDir = normalizeMemoryDir(options.memoryDir);
  const packages = await discoverGhostPackages(root, { memoryDir });
  const issues: LintIssue[] = [];

  for (const pkg of packages) {
    const rawReport = await lintFingerprintPackage(pkg.dir, root);
    issues.push(
      ...prefixIssues(
        fingerprintPackageDisplayPath(pkg.relative_root, memoryDir),
        rawReport.issues,
      ),
    );
    if (rawReport.errors > 0) continue;

    let stack: GhostFingerprintStack;
    try {
      stack = await loadFingerprintStackForPath(pkg.root, root, { memoryDir });
    } catch (err) {
      issues.push({
        severity: "error",
        rule: "stack-merge-invalid",
        message: err instanceof Error ? err.message : String(err),
        path: fingerprintPackageDisplayPath(pkg.relative_root, memoryDir),
      });
      continue;
    }
    const fingerprintReport = lintGhostFingerprint(stack.merged.fingerprint);
    issues.push(
      ...prefixIssues(
        `${fingerprintPackageDisplayPath(pkg.relative_root, memoryDir)}/merged.fingerprint`,
        fingerprintReport.issues,
      ),
    );
    const checksReport = lintGhostValidate(stack.merged.checks, {
      fingerprint: stack.merged.fingerprint,
      map: mapFromFingerprint(stack.merged.fingerprint),
    });
    issues.push(
      ...prefixIssues(
        `${fingerprintPackageDisplayPath(pkg.relative_root, memoryDir)}/merged.validate.yml`,
        checksReport.issues,
      ),
    );
  }

  return finalizeLint(issues);
}

export async function verifyAllFingerprintStacks(
  root = process.cwd(),
  options: FingerprintDirectoryOptions = {},
): Promise<VerifyFingerprintReport> {
  const memoryDir = normalizeMemoryDir(options.memoryDir);
  const packages = await discoverGhostPackages(root, { memoryDir });
  const issues: VerifyFingerprintIssue[] = [];

  for (const pkg of packages) {
    const report = await verifyFingerprintPackage(pkg.dir, root, {
      root: pkg.root,
    });
    issues.push(
      ...report.issues.map((issue) => ({
        ...issue,
        path: issue.path
          ? `${fingerprintPackageDisplayPath(pkg.relative_root, memoryDir)}.${issue.path}`
          : fingerprintPackageDisplayPath(pkg.relative_root, memoryDir),
      })),
    );
    try {
      await loadFingerprintStackForPath(pkg.root, root, { memoryDir });
    } catch (err) {
      issues.push({
        severity: "error",
        rule: "stack-merge-invalid",
        message: err instanceof Error ? err.message : String(err),
        path: fingerprintPackageDisplayPath(pkg.relative_root, memoryDir),
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
    withConfig?: boolean;
    reference?: string;
    force?: boolean;
    memoryDir?: string;
  } = {},
): Promise<FingerprintPackagePaths> {
  const root = resolve(cwd, scopePath);
  await mkdir(root, { recursive: true });
  return resolveAndInit(root, options);
}

async function resolveAndInit(
  root: string,
  options: {
    withConfig?: boolean;
    reference?: string;
    force?: boolean;
    memoryDir?: string;
  },
): Promise<FingerprintPackagePaths> {
  const { initFingerprintPackage } = await import("./fingerprint-package.js");
  const { memoryDir, ...initOptions } = options;
  return initFingerprintPackage(
    normalizeMemoryDir(memoryDir),
    root,
    initOptions,
  );
}

function parseChecks(raw: string): GhostValidateDocument {
  const parsed = parseYamlSafe(raw, "fingerprint/validate.yml");
  return GhostValidateSchema.parse(parsed) as GhostValidateDocument;
}

function mergeFingerprints(
  fingerprints: GhostFingerprintDocument[],
): GhostFingerprintDocument {
  const merged: GhostFingerprintDocument = {
    schema: GHOST_FINGERPRINT_SCHEMA,
    intent: {
      summary: {},
      situations: [],
      principles: [],
      experience_contracts: [],
    },
    inventory: {
      topology: {},
      building_blocks: {},
      exemplars: [],
      sources: [],
    },
    composition: {
      patterns: [],
    },
  };

  for (const fingerprint of fingerprints) {
    merged.intent = mergeIntent(merged.intent, fingerprint.intent);
    merged.inventory = mergeInventory(merged.inventory, fingerprint.inventory);
    merged.composition = mergeComposition(
      merged.composition,
      fingerprint.composition,
    );
  }

  const report = lintGhostFingerprint(merged);
  if (report.errors > 0) {
    const first = report.issues.find((issue) => issue.severity === "error");
    const suffix = first?.path ? ` @ ${first.path}` : "";
    throw new Error(
      `Merged fingerprint failed lint: ${first?.message ?? "invalid fingerprint"}${suffix}`,
    );
  }
  return merged;
}

function mergeIntent(
  parent: GhostFingerprintIntent,
  child: GhostFingerprintIntent,
): GhostFingerprintIntent {
  return {
    summary: mergeSummary(parent.summary, child.summary),
    situations: mergeById([...parent.situations, ...child.situations]),
    principles: mergeById([...parent.principles, ...child.principles]),
    experience_contracts: mergeById([
      ...parent.experience_contracts,
      ...child.experience_contracts,
    ]),
  };
}

function mergeInventory(
  parent: GhostFingerprintInventory,
  child: GhostFingerprintInventory,
): GhostFingerprintInventory {
  return {
    topology: mergeTopology(parent.topology, child.topology),
    building_blocks: mergeBuildingBlocks(
      parent.building_blocks,
      child.building_blocks,
    ),
    exemplars: mergeById([...parent.exemplars, ...child.exemplars]),
    sources: mergeById([...parent.sources, ...child.sources]),
  };
}

function mergeComposition(
  parent: GhostFingerprintComposition,
  child: GhostFingerprintComposition,
): GhostFingerprintComposition {
  return {
    patterns: mergeById([...parent.patterns, ...child.patterns]),
  };
}

function mergeBuildingBlocks(
  parent: GhostFingerprintInventoryBuildingBlocks,
  child: GhostFingerprintInventoryBuildingBlocks,
): GhostFingerprintInventoryBuildingBlocks {
  return {
    tokens: mergeStrings(parent.tokens, child.tokens),
    components: mergeStrings(parent.components, child.components),
    libraries: mergeStrings(parent.libraries, child.libraries),
    assets: mergeStrings(parent.assets, child.assets),
    routes: mergeStrings(parent.routes, child.routes),
    files: mergeStrings(parent.files, child.files),
    notes: mergeStrings(parent.notes, child.notes),
  };
}

function mergeSummary(
  parent: GhostFingerprintSummary,
  child: GhostFingerprintSummary,
): GhostFingerprintSummary {
  return {
    ...(parent.product ? { product: parent.product } : {}),
    ...(child.product ? { product: child.product } : {}),
    audience: mergeStrings(parent.audience, child.audience),
    goals: mergeStrings(parent.goals, child.goals),
    anti_goals: mergeStrings(parent.anti_goals, child.anti_goals),
    tradeoffs: mergeStrings(parent.tradeoffs, child.tradeoffs),
    tone: mergeStrings(parent.tone, child.tone),
  };
}

function mergeTopology(
  parent: GhostFingerprintTopology,
  child: GhostFingerprintTopology,
): GhostFingerprintTopology {
  const scopes = mergeById([
    ...(parent.scopes ?? []),
    ...(child.scopes ?? []),
  ]) as GhostFingerprintTopologyScope[];
  return {
    scopes,
    surface_types: mergeStrings(
      mergeStrings(parent.surface_types, child.surface_types),
      collectSurfaceTypes(scopes),
    ),
  };
}

function collectSurfaceTypes(
  scopes: GhostFingerprintTopologyScope[],
): string[] | undefined {
  return mergeStrings(scopes.flatMap((scope) => scope.surface_types ?? []));
}

function mergeChecks(
  checksDocs: Array<GhostValidateDocument | undefined>,
): GhostValidateDocument {
  const checks = mergeById(checksDocs.flatMap((doc) => doc?.checks ?? []));
  return {
    schema: GHOST_VALIDATE_SCHEMA,
    id: "fingerprint-stack",
    checks: checks as GhostCheck[],
  };
}

function mergeById<T extends { id: string }>(entries: T[]): T[] {
  return mergeByKey(entries, (entry) => entry.id) as T[];
}

function mergeByKey<T>(entries: T[], keyFor: (entry: T) => string): T[] {
  const byKey = new Map<string, T>();
  for (const entry of entries) {
    byKey.set(keyFor(entry), entry);
  }
  return [...byKey.values()];
}

function mergeStrings(a?: string[], b?: string[]): string[] | undefined {
  const out = [...new Set([...(a ?? []), ...(b ?? [])])];
  return out.length ? out : undefined;
}

function normalizeFingerprintPaths(
  input: GhostFingerprintDocument,
  baseRoot: string,
  repoRoot: string,
): GhostFingerprintDocument {
  const fingerprint = clone(input);
  fingerprint.inventory.topology.scopes =
    fingerprint.inventory.topology.scopes?.map((scope) => ({
      ...scope,
      paths: scope.paths.map((path) => normalizePath(path, baseRoot, repoRoot)),
    }));
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
      applies_to: normalizeScopePaths(entry.applies_to, baseRoot, repoRoot),
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
      applies_to: normalizeScopePaths(entry.applies_to, baseRoot, repoRoot),
      evidence: normalizeFingerprintEvidence(
        entry.evidence,
        baseRoot,
        repoRoot,
      ),
    }));
  fingerprint.composition.patterns = fingerprint.composition.patterns.map(
    (entry) => ({
      ...entry,
      applies_to: normalizeScopePaths(entry.applies_to, baseRoot, repoRoot),
      evidence: normalizeFingerprintEvidence(
        entry.evidence,
        baseRoot,
        repoRoot,
      ),
    }),
  );
  return fingerprint;
}

function normalizeChecksPaths(
  input: GhostValidateDocument,
  baseRoot: string,
  repoRoot: string,
): GhostValidateDocument {
  const checks = clone(input);
  checks.checks = checks.checks.map((check) => ({
    ...check,
    applies_to: check.applies_to
      ? {
          ...check.applies_to,
          paths: check.applies_to.paths?.map((path) =>
            normalizePath(path, baseRoot, repoRoot),
          ),
        }
      : undefined,
    evidence: check.evidence
      ? {
          ...check.evidence,
          examples: check.evidence.examples?.map((example) =>
            typeof example === "string"
              ? normalizePath(example, baseRoot, repoRoot)
              : {
                  ...example,
                  path: normalizePath(example.path, baseRoot, repoRoot),
                },
          ),
        }
      : undefined,
  }));
  return checks;
}

function normalizeScopePaths<T extends { paths?: string[] }>(
  scope: T | undefined,
  baseRoot: string,
  repoRoot: string,
): T | undefined {
  if (!scope?.paths) return scope;
  return {
    ...scope,
    paths: scope.paths.map((path) => normalizePath(path, baseRoot, repoRoot)),
  };
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
  return pathExists(
    resolve(packageDir, FINGERPRINT_DIRNAME, FINGERPRINT_MANIFEST_FILENAME),
  );
}

function packageRef(
  dir: string,
  repoRoot: string,
  memoryDir: string,
): DiscoveredGhostPackage {
  const root = rootForFingerprintPackageDir(dir, memoryDir);
  return {
    dir,
    root,
    relative_root: normalizeRelative(repoRoot, root),
    fingerprint_dir: memoryDir,
  };
}

function layerRef(
  layer: GhostFingerprintStackLayer,
): GhostFingerprintStackLayerRef {
  return {
    dir: layer.dir,
    root: layer.root,
    relative_root: layer.relative_root,
    fingerprint_dir: layer.fingerprint_dir,
  };
}

export function normalizeMemoryDir(
  memoryDir = FINGERPRINT_PACKAGE_DIR,
): string {
  const normalized = memoryDir
    .trim()
    .replaceAll("\\", "/")
    .replace(/\/+/g, "/")
    .replace(/\/$/g, "");
  if (!normalized) {
    throw new Error("--memory-dir must not be empty");
  }
  if (
    isAbsolute(memoryDir) ||
    normalized.startsWith("/") ||
    /^[A-Za-z]:/.test(normalized)
  ) {
    throw new Error("--memory-dir must be a relative directory path");
  }
  const segments = normalized.split("/");
  if (
    segments.some(
      (segment) => segment === "." || segment === ".." || segment === "",
    )
  ) {
    throw new Error(
      "--memory-dir must not contain '.', '..', or empty path segments",
    );
  }
  return normalized;
}

export const GHOST_MEMORY_DIR_ENV = "GHOST_MEMORY_DIR";

export function resolveMemoryDirDefault(
  explicitMemoryDir?: unknown,
  env: NodeJS.ProcessEnv = process.env,
): string {
  return normalizeMemoryDir(
    typeof explicitMemoryDir === "string"
      ? explicitMemoryDir
      : env[GHOST_MEMORY_DIR_ENV],
  );
}

export function fingerprintPackageDisplayPath(
  relativeRoot: string,
  memoryDir = FINGERPRINT_PACKAGE_DIR,
): string {
  const normalizedMemoryDir = normalizeMemoryDir(memoryDir);
  return relativeRoot === "."
    ? normalizedMemoryDir
    : `${relativeRoot}/${normalizedMemoryDir}`;
}

function skipDiscoveryDirs(memoryDir: string): Set<string> {
  return new Set([
    ...BASE_SKIP_DISCOVERY_DIRS,
    normalizeMemoryDir(memoryDir).split("/")[0],
  ]);
}

function rootForFingerprintPackageDir(
  packageDir: string,
  memoryDir: string,
): string {
  let root = packageDir;
  for (const _segment of normalizeMemoryDir(memoryDir).split("/")) {
    root = dirname(root);
  }
  return root;
}

const readOptional = readOptionalUtf8;

function parseYamlSafe(raw: string, label: string): unknown {
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
