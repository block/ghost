import { execFile } from "node:child_process";
import type { Dirent } from "node:fs";
import { access, mkdir, readdir, readFile, stat } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import {
  GHOST_CHECKS_SCHEMA,
  GHOST_FINGERPRINT_SCHEMA,
  type GhostCheck,
  type GhostChecksDocument,
  GhostChecksSchema,
  type GhostDecisionDocument,
  GhostDecisionSchema,
  type GhostExperienceEvidence,
  type GhostExperienceScope,
  type GhostFingerprintDocument,
  type GhostFingerprintEvidence,
  GhostFingerprintSchema,
  type GhostFingerprintSummary,
  type GhostFingerprintTopology,
  type GhostFingerprintTopologyExample,
  type GhostFingerprintTopologyScope,
  lintGhostChecks,
  lintGhostDecision,
  lintGhostFingerprint,
  type MapFrontmatter,
} from "#ghost-core";
import {
  FINGERPRINT_PACKAGE_DIR,
  FINGERPRINT_YML_FILENAME,
} from "./constants.js";
import type { PackageMemory } from "./context/package-memory.js";
import type { FingerprintPackagePaths } from "./fingerprint-package.js";
import {
  lintFingerprintPackage,
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

export interface MemoryDirectoryOptions {
  memoryDir?: string;
}

export interface GhostMemoryStackLayerRef {
  dir: string;
  root: string;
  relative_root: string;
  memory_dir: string;
}

export interface GhostMemoryStackLayer extends GhostMemoryStackLayerRef {
  fingerprint: GhostFingerprintDocument;
  fingerprint_raw: string;
  checks?: GhostChecksDocument;
  checks_raw?: string;
  intent?: string;
  decisions: GhostDecisionDocument[];
}

export interface GhostMemoryStack {
  target_path: string;
  repo_root: string;
  memory_dir: string;
  layers: GhostMemoryStackLayer[];
  merged: {
    fingerprint: GhostFingerprintDocument;
    checks: GhostChecksDocument;
    intent: string | null;
    decisions: GhostDecisionDocument[];
  };
  provenance: {
    merge: "child-wins-by-id";
    layers: GhostMemoryStackLayerRef[];
  };
}

export interface GhostMemoryStackGroup {
  key: string;
  changed_files: string[];
  stack: GhostMemoryStack;
}

export interface DiscoveredGhostPackage {
  dir: string;
  root: string;
  relative_root: string;
  memory_dir: string;
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
  options: MemoryDirectoryOptions = {},
): Promise<DiscoveredGhostPackage[]> {
  const repoRoot = await resolveGitRoot(root);
  const memoryDir = normalizeMemoryDir(options.memoryDir);
  const skipDirs = skipDiscoveryDirs(memoryDir);
  const packages: DiscoveredGhostPackage[] = [];

  async function walk(dir: string): Promise<void> {
    const packageDir = resolve(dir, memoryDir);
    if (await pathExists(resolve(packageDir, FINGERPRINT_YML_FILENAME))) {
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

export async function discoverMemoryStack(
  targetPath = ".",
  cwd = process.cwd(),
  options: MemoryDirectoryOptions = {},
): Promise<{ target_path: string; repo_root: string; packages: string[] }> {
  const repoRoot = await resolveGitRoot(cwd);
  const memoryDir = normalizeMemoryDir(options.memoryDir);
  const target = resolve(cwd, targetPath);
  let current = await startingDirectory(target);
  const packages: string[] = [];

  while (isWithinOrEqual(repoRoot, current)) {
    const packageDir = resolve(current, memoryDir);
    if (await pathExists(resolve(packageDir, FINGERPRINT_YML_FILENAME))) {
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

export async function loadMemoryStackForPath(
  targetPath = ".",
  cwd = process.cwd(),
  options: MemoryDirectoryOptions = {},
): Promise<GhostMemoryStack> {
  const memoryDir = normalizeMemoryDir(options.memoryDir);
  const discovered = await discoverMemoryStack(targetPath, cwd, {
    memoryDir,
  });
  if (discovered.packages.length === 0) {
    throw new Error(
      `No ${memoryDir}/${FINGERPRINT_YML_FILENAME} found for ${targetPath}.`,
    );
  }

  const layers = await Promise.all(
    discovered.packages.map((dir) =>
      loadMemoryStackLayer(dir, discovered.repo_root, memoryDir),
    ),
  );
  return buildMemoryStack(
    discovered.target_path,
    discovered.repo_root,
    layers,
    memoryDir,
  );
}

export async function groupMemoryStacksForPaths(
  paths: string[],
  cwd = process.cwd(),
  options: MemoryDirectoryOptions = {},
): Promise<GhostMemoryStackGroup[]> {
  const targets = paths.length > 0 ? paths : ["."];
  const memoryDir = normalizeMemoryDir(options.memoryDir);
  const groups = new Map<string, GhostMemoryStackGroup>();

  for (const path of targets) {
    const stack = await loadMemoryStackForPath(path, cwd, { memoryDir });
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

export function buildMemoryStack(
  targetPath: string,
  repoRoot: string,
  layers: GhostMemoryStackLayer[],
  memoryDir = FINGERPRINT_PACKAGE_DIR,
): GhostMemoryStack {
  const normalizedMemoryDir = normalizeMemoryDir(memoryDir);
  if (layers.length === 0) {
    throw new Error("Cannot build a Ghost memory stack without layers.");
  }

  const fingerprint = mergeFingerprints(
    layers.map((layer) => layer.fingerprint),
  );
  const checks = mergeChecks(layers.map((layer) => layer.checks));
  const decisions = mergeById(layers.flatMap((layer) => layer.decisions));
  const checkLint = lintGhostChecks(checks, {
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
    memory_dir: normalizedMemoryDir,
    layers,
    merged: {
      fingerprint,
      checks,
      intent: mergeIntent(layers),
      decisions,
    },
    provenance: {
      merge: "child-wins-by-id",
      layers: layers.map(layerRef),
    },
  };
}

export async function loadMemoryStackLayer(
  packageDir: string,
  repoRoot: string,
  memoryDir = FINGERPRINT_PACKAGE_DIR,
): Promise<GhostMemoryStackLayer> {
  const paths = resolveFingerprintPackage(packageDir, process.cwd());
  const normalizedMemoryDir = normalizeMemoryDir(memoryDir);
  const root = rootForMemoryPackageDir(paths.dir, normalizedMemoryDir);
  const [fingerprintRaw, checksRaw, intent, decisions] = await Promise.all([
    readFile(paths.fingerprintYml, "utf-8"),
    readOptional(paths.checks),
    readOptional(paths.intent),
    readDecisionDirectory(paths.decisions),
  ]);

  const fingerprint = normalizeFingerprintPaths(
    parseFingerprint(fingerprintRaw),
    root,
    repoRoot,
  );
  const checks = checksRaw
    ? normalizeChecksPaths(parseChecks(checksRaw), root, repoRoot)
    : undefined;

  if (checks) {
    const checksReport = lintGhostChecks(checks);
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
    fingerprint_raw: fingerprintRaw,
    ...(checks ? { checks } : {}),
    ...(checksRaw ? { checks_raw: checksRaw } : {}),
    ...(intent ? { intent } : {}),
    decisions: decisions.map((decision) =>
      normalizeDecisionPaths(decision, root, repoRoot),
    ),
  };
}

export function memoryStackToPackageMemory(
  stack: GhostMemoryStack,
  nameOverride?: string,
): PackageMemory {
  const name = sanitizeName(
    nameOverride ??
      stack.merged.fingerprint.summary.product ??
      stack.layers.at(-1)?.relative_root ??
      "ghost-package",
  );
  return {
    name,
    memoryDir: stack.memory_dir,
    fingerprint: stack.merged.fingerprint,
    fingerprintRaw: stringifyYaml(stack.merged.fingerprint, { lineWidth: 0 }),
    checks: stack.merged.checks,
    checksRaw: stringifyYaml(stack.merged.checks, { lineWidth: 0 }),
    intent: stack.merged.intent ?? undefined,
  };
}

export function mapFromFingerprint(
  fingerprint: GhostFingerprintDocument,
): Pick<MapFrontmatter, "scopes" | "feature_areas"> {
  return {
    scopes: fingerprint.topology.scopes?.map((scope) => ({
      id: scope.id,
      name: scope.id,
      kind: "fingerprint-topology",
      paths: [...scope.paths],
    })),
    feature_areas: [],
  };
}

export async function lintAllMemoryStacks(
  root = process.cwd(),
  options: MemoryDirectoryOptions = {},
): Promise<LintReport> {
  const memoryDir = normalizeMemoryDir(options.memoryDir);
  const packages = await discoverGhostPackages(root, { memoryDir });
  const issues: LintIssue[] = [];

  for (const pkg of packages) {
    const rawReport = await lintFingerprintPackage(pkg.dir, root);
    issues.push(
      ...prefixIssues(
        memoryPackageDisplayPath(pkg.relative_root, memoryDir),
        rawReport.issues,
      ),
    );
    if (rawReport.errors > 0) continue;

    let stack: GhostMemoryStack;
    try {
      stack = await loadMemoryStackForPath(pkg.root, root, { memoryDir });
    } catch (err) {
      issues.push({
        severity: "error",
        rule: "stack-merge-invalid",
        message: err instanceof Error ? err.message : String(err),
        path: memoryPackageDisplayPath(pkg.relative_root, memoryDir),
      });
      continue;
    }
    const fingerprintReport = lintGhostFingerprint(stack.merged.fingerprint);
    issues.push(
      ...prefixIssues(
        `${memoryPackageDisplayPath(pkg.relative_root, memoryDir)}/merged.fingerprint.yml`,
        fingerprintReport.issues,
      ),
    );
    const checksReport = lintGhostChecks(stack.merged.checks, {
      fingerprint: stack.merged.fingerprint,
      map: mapFromFingerprint(stack.merged.fingerprint),
    });
    issues.push(
      ...prefixIssues(
        `${memoryPackageDisplayPath(pkg.relative_root, memoryDir)}/merged.checks.yml`,
        checksReport.issues,
      ),
    );
  }

  return finalizeLint(issues);
}

export async function verifyAllMemoryStacks(
  root = process.cwd(),
  options: MemoryDirectoryOptions = {},
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
          ? `${memoryPackageDisplayPath(pkg.relative_root, memoryDir)}.${issue.path}`
          : memoryPackageDisplayPath(pkg.relative_root, memoryDir),
      })),
    );
    try {
      await loadMemoryStackForPath(pkg.root, root, { memoryDir });
    } catch (err) {
      issues.push({
        severity: "error",
        rule: "stack-merge-invalid",
        message: err instanceof Error ? err.message : String(err),
        path: memoryPackageDisplayPath(pkg.relative_root, memoryDir),
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

export async function initScopedMemoryPackage(
  scopePath: string,
  cwd = process.cwd(),
  options: {
    withIntent?: boolean;
    withConfig?: boolean;
    reference?: string;
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
    withIntent?: boolean;
    withConfig?: boolean;
    reference?: string;
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

function parseFingerprint(raw: string): GhostFingerprintDocument {
  const parsed = parseYamlSafe(raw, "fingerprint.yml");
  const report = lintGhostFingerprint(parsed);
  if (report.errors > 0) {
    const first = report.issues.find((issue) => issue.severity === "error");
    const suffix = first?.path ? ` @ ${first.path}` : "";
    throw new Error(
      `fingerprint.yml failed lint: ${first?.message ?? "invalid fingerprint"}${suffix}`,
    );
  }
  return GhostFingerprintSchema.parse(parsed) as GhostFingerprintDocument;
}

function parseChecks(raw: string): GhostChecksDocument {
  const parsed = parseYamlSafe(raw, "checks.yml");
  return GhostChecksSchema.parse(parsed) as GhostChecksDocument;
}

async function readDecisionDirectory(
  dirPath: string,
): Promise<GhostDecisionDocument[]> {
  const parsed = await readYamlFiles(dirPath);
  const docs: GhostDecisionDocument[] = [];
  for (const { path, value } of parsed) {
    const report = lintGhostDecision(value);
    if (report.errors > 0) throwMemoryLintError(path, report.issues);
    docs.push(GhostDecisionSchema.parse(value) as GhostDecisionDocument);
  }
  return docs;
}

async function readYamlFiles(
  dirPath: string,
): Promise<Array<{ path: string; value: unknown }>> {
  let entries: Dirent<string>[];
  try {
    entries = await readdir(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }

  const docs: Array<{ path: string; value: unknown }> = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isFile()) continue;
    if (entry.name.startsWith(".")) continue;
    if (!/\.ya?ml$/i.test(entry.name)) continue;
    const path = resolve(dirPath, entry.name);
    docs.push({
      path,
      value: parseYamlSafe(await readFile(path, "utf-8"), path),
    });
  }
  return docs;
}

function throwMemoryLintError(
  path: string,
  issues: Array<{ severity: string; message: string; path?: string }>,
): never {
  const first = issues.find((issue) => issue.severity === "error");
  const suffix = first?.path ? ` @ ${first.path}` : "";
  throw new Error(
    `${path} failed lint: ${first?.message ?? "invalid memory"}${suffix}`,
  );
}

function mergeFingerprints(
  fingerprints: GhostFingerprintDocument[],
): GhostFingerprintDocument {
  const merged: GhostFingerprintDocument = {
    schema: GHOST_FINGERPRINT_SCHEMA,
    summary: {},
    topology: {},
    situations: [],
    principles: [],
    experience_contracts: [],
    patterns: [],
    implementation_vocabulary: {},
  };

  for (const fingerprint of fingerprints) {
    merged.summary = mergeSummary(merged.summary, fingerprint.summary);
    merged.topology = mergeTopology(merged.topology, fingerprint.topology);
    merged.situations = mergeById([
      ...merged.situations,
      ...fingerprint.situations,
    ]);
    merged.principles = mergeById([
      ...merged.principles,
      ...fingerprint.principles,
    ]);
    merged.experience_contracts = mergeById([
      ...merged.experience_contracts,
      ...fingerprint.experience_contracts,
    ]);
    merged.patterns = mergeById([...merged.patterns, ...fingerprint.patterns]);
    merged.implementation_vocabulary = {
      tokens: mergeStrings(
        merged.implementation_vocabulary.tokens,
        fingerprint.implementation_vocabulary.tokens,
      ),
      components: mergeStrings(
        merged.implementation_vocabulary.components,
        fingerprint.implementation_vocabulary.components,
      ),
      libraries: mergeStrings(
        merged.implementation_vocabulary.libraries,
        fingerprint.implementation_vocabulary.libraries,
      ),
      assets: mergeStrings(
        merged.implementation_vocabulary.assets,
        fingerprint.implementation_vocabulary.assets,
      ),
      notes: mergeStrings(
        merged.implementation_vocabulary.notes,
        fingerprint.implementation_vocabulary.notes,
      ),
    };
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
  const examples = mergeByKey(
    [...(parent.examples ?? []), ...(child.examples ?? [])],
    (example) => example.path,
  ) as GhostFingerprintTopologyExample[];
  return {
    scopes,
    surface_types: mergeStrings(
      mergeStrings(parent.surface_types, child.surface_types),
      collectSurfaceTypes(scopes, examples),
    ),
    examples,
  };
}

function collectSurfaceTypes(
  scopes: GhostFingerprintTopologyScope[],
  examples: GhostFingerprintTopologyExample[],
): string[] | undefined {
  return mergeStrings(
    scopes.flatMap((scope) => scope.surface_types ?? []),
    examples.flatMap((example) =>
      example.surface_type ? [example.surface_type] : [],
    ),
  );
}

function mergeChecks(
  checksDocs: Array<GhostChecksDocument | undefined>,
): GhostChecksDocument {
  const checks = mergeById(checksDocs.flatMap((doc) => doc?.checks ?? []));
  return {
    schema: GHOST_CHECKS_SCHEMA,
    id: "memory-stack",
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

function mergeIntent(layers: GhostMemoryStackLayer[]): string | null {
  const chunks = layers
    .filter((layer) => layer.intent?.trim())
    .map(
      (layer) =>
        `# ${memoryPackageDisplayPath(layer.relative_root, layer.memory_dir)}/intent.md\n\n${layer.intent?.trim()}`,
    );
  return chunks.length ? `${chunks.join("\n\n")}\n` : null;
}

function normalizeFingerprintPaths(
  input: GhostFingerprintDocument,
  baseRoot: string,
  repoRoot: string,
): GhostFingerprintDocument {
  const fingerprint = clone(input);
  fingerprint.topology.scopes = fingerprint.topology.scopes?.map((scope) => ({
    ...scope,
    paths: scope.paths.map((path) => normalizePath(path, baseRoot, repoRoot)),
  }));
  fingerprint.topology.examples = fingerprint.topology.examples?.map(
    (example) => ({
      ...example,
      path: normalizePath(example.path, baseRoot, repoRoot),
    }),
  );
  fingerprint.situations = fingerprint.situations.map((entry) => ({
    ...entry,
    evidence: normalizeFingerprintEvidence(entry.evidence, baseRoot, repoRoot),
  }));
  fingerprint.principles = fingerprint.principles.map((entry) => ({
    ...entry,
    applies_to: normalizeScopePaths(entry.applies_to, baseRoot, repoRoot),
    evidence: normalizeFingerprintEvidence(entry.evidence, baseRoot, repoRoot),
  }));
  fingerprint.experience_contracts = fingerprint.experience_contracts.map(
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
  fingerprint.patterns = fingerprint.patterns.map((entry) => ({
    ...entry,
    applies_to: normalizeScopePaths(entry.applies_to, baseRoot, repoRoot),
    evidence: normalizeFingerprintEvidence(entry.evidence, baseRoot, repoRoot),
  }));
  return fingerprint;
}

function normalizeChecksPaths(
  input: GhostChecksDocument,
  baseRoot: string,
  repoRoot: string,
): GhostChecksDocument {
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

function normalizeDecisionPaths(
  input: GhostDecisionDocument,
  baseRoot: string,
  repoRoot: string,
): GhostDecisionDocument {
  const decision = clone(input);
  return {
    ...decision,
    scope: normalizeExperienceScopePaths(decision.scope, baseRoot, repoRoot),
    evidence: normalizeExperienceEvidence(
      decision.evidence,
      baseRoot,
      repoRoot,
    ),
  };
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

function normalizeExperienceScopePaths(
  scope: GhostExperienceScope | undefined,
  baseRoot: string,
  repoRoot: string,
): GhostExperienceScope | undefined {
  return normalizeScopePaths(scope, baseRoot, repoRoot);
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

function normalizeExperienceEvidence(
  evidence: GhostExperienceEvidence[],
  baseRoot: string,
  repoRoot: string,
): GhostExperienceEvidence[] {
  return evidence.map((entry) =>
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

function packageRef(
  dir: string,
  repoRoot: string,
  memoryDir: string,
): DiscoveredGhostPackage {
  const root = rootForMemoryPackageDir(dir, memoryDir);
  return {
    dir,
    root,
    relative_root: normalizeRelative(repoRoot, root),
    memory_dir: memoryDir,
  };
}

function layerRef(layer: GhostMemoryStackLayer): GhostMemoryStackLayerRef {
  return {
    dir: layer.dir,
    root: layer.root,
    relative_root: layer.relative_root,
    memory_dir: layer.memory_dir,
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

export function memoryPackageDisplayPath(
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

function rootForMemoryPackageDir(
  packageDir: string,
  memoryDir: string,
): string {
  let root = packageDir;
  for (const _segment of normalizeMemoryDir(memoryDir).split("/")) {
    root = dirname(root);
  }
  return root;
}

async function readOptional(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, "utf-8");
  } catch {
    return undefined;
  }
}

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
