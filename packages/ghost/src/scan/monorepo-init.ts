import { readFile } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import { glob } from "tinyglobby";
import { parse as parseYaml } from "yaml";

const PACKAGE_JSON = "package.json";

export type MonorepoInitCandidateSource = "package-json" | "pnpm-workspace";

export interface MonorepoInitCandidate {
  path: string;
  source: MonorepoInitCandidateSource;
  packageJson: string;
}

export async function detectMonorepoInitCandidates(
  root: string,
): Promise<MonorepoInitCandidate[]> {
  const repoRoot = resolve(root);
  const candidates = new Map<string, MonorepoInitCandidate>();

  await addCandidates(
    candidates,
    repoRoot,
    await readPackageJsonWorkspacePatterns(repoRoot),
    "package-json",
  );
  await addCandidates(
    candidates,
    repoRoot,
    await readPnpmWorkspacePatterns(repoRoot),
    "pnpm-workspace",
  );

  return [...candidates.values()].sort((a, b) => a.path.localeCompare(b.path));
}

async function addCandidates(
  candidates: Map<string, MonorepoInitCandidate>,
  root: string,
  patterns: string[],
  source: MonorepoInitCandidateSource,
): Promise<void> {
  for (const path of await expandWorkspacePatterns(root, patterns)) {
    if (candidates.has(path)) continue;
    candidates.set(path, {
      path,
      source,
      packageJson: `${path}/${PACKAGE_JSON}`,
    });
  }
}

async function readPackageJsonWorkspacePatterns(
  root: string,
): Promise<string[]> {
  let raw: string;
  try {
    raw = await readFile(join(root, PACKAGE_JSON), "utf-8");
  } catch {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!parsed || typeof parsed !== "object") return [];
  return normalizeWorkspacePatterns(
    (parsed as { workspaces?: unknown }).workspaces,
  );
}

async function readPnpmWorkspacePatterns(root: string): Promise<string[]> {
  let raw: string;
  try {
    raw = await readFile(join(root, "pnpm-workspace.yaml"), "utf-8");
  } catch {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = parseYaml(raw);
  } catch {
    return [];
  }
  if (!parsed || typeof parsed !== "object") return [];
  const packages = (parsed as { packages?: unknown }).packages;
  return Array.isArray(packages)
    ? packages.filter((value): value is string => typeof value === "string")
    : [];
}

function normalizeWorkspacePatterns(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }
  if (value && typeof value === "object") {
    const packages = (value as { packages?: unknown }).packages;
    if (Array.isArray(packages)) {
      return packages.filter(
        (entry): entry is string => typeof entry === "string",
      );
    }
  }
  return [];
}

async function expandWorkspacePatterns(
  root: string,
  patterns: string[],
): Promise<string[]> {
  const packageJsonPatterns = patterns
    .map(workspacePatternToPackageJsonPattern)
    .filter((pattern): pattern is string => Boolean(pattern));
  if (packageJsonPatterns.length === 0) return [];

  let packageJsonPaths: string[];
  try {
    packageJsonPaths = await glob(packageJsonPatterns, {
      absolute: false,
      cwd: root,
      dot: false,
      ignore: ["**/node_modules/**", "**/.*/**"],
      onlyFiles: true,
    });
  } catch {
    return [];
  }

  const out: string[] = [];
  for (const packageJsonPath of packageJsonPaths) {
    const path = packageRootFromPackageJson(root, packageJsonPath);
    if (path) out.push(path);
  }
  return [...new Set(out)].sort();
}

function workspacePatternToPackageJsonPattern(
  pattern: string,
): string | undefined {
  const trimmed = pattern.trim();
  const negated = trimmed.startsWith("!");
  const cleaned = cleanWorkspacePattern(negated ? trimmed.slice(1) : trimmed);
  if (!cleaned) return undefined;
  const packageJsonPattern = cleaned.endsWith(`/${PACKAGE_JSON}`)
    ? cleaned
    : `${cleaned}/${PACKAGE_JSON}`;
  return negated ? `!${packageJsonPattern}` : packageJsonPattern;
}

function cleanWorkspacePattern(pattern: string): string | undefined {
  const cleaned = pattern
    .trim()
    .replaceAll("\\", "/")
    .replace(/\/+/g, "/")
    .replace(/\/$/g, "")
    .replace(/^\.\//, "");
  if (!cleaned) return undefined;
  if (cleaned.split("/").some(shouldSkipDir)) return undefined;
  return cleaned;
}

function packageRootFromPackageJson(
  root: string,
  packageJsonPath: string,
): string | undefined {
  const normalized = packageJsonPath
    .replaceAll("\\", "/")
    .replace(/\/+/g, "/")
    .replace(/^\.\//, "");
  if (normalized === PACKAGE_JSON) return undefined;
  if (!normalized.endsWith(`/${PACKAGE_JSON}`)) return undefined;

  const path = normalized.slice(0, -`/${PACKAGE_JSON}`.length);
  if (!path || path.split("/").some(shouldSkipDir)) return undefined;
  if (!isInsideRoot(root, resolve(root, path))) return undefined;
  return path;
}

function shouldSkipDir(name: string): boolean {
  return (
    name === "" ||
    name === "." ||
    name === ".." ||
    name === "node_modules" ||
    name.startsWith(".")
  );
}

function isInsideRoot(root: string, candidate: string): boolean {
  const rel = relative(root, candidate);
  return rel !== "" && !rel.startsWith("..") && !rel.startsWith(`..${sep}`);
}
