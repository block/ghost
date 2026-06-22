import type { Dirent } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
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
  for (const pattern of patterns) {
    for (const path of await expandWorkspacePattern(root, pattern)) {
      if (candidates.has(path)) continue;
      candidates.set(path, {
        path,
        source,
        packageJson: `${path}/${PACKAGE_JSON}`,
      });
    }
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

async function expandWorkspacePattern(
  root: string,
  pattern: string,
): Promise<string[]> {
  const cleaned = cleanWorkspacePattern(pattern);
  if (!cleaned) return [];
  if (!cleaned.includes("*")) {
    return (await isPackageRoot(root, cleaned)) ? [cleaned] : [];
  }

  const lastSlash = cleaned.lastIndexOf("/");
  if (lastSlash === -1) return [];
  const parent = cleaned.slice(0, lastSlash);
  const tail = cleaned.slice(lastSlash + 1);
  if (tail !== "*") return [];

  const parentAbs = resolve(root, parent);
  if (!isInsideRoot(root, parentAbs)) return [];

  let entries: Dirent[];
  try {
    entries = await readdir(parentAbs, { withFileTypes: true });
  } catch {
    return [];
  }

  const out: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (shouldSkipDir(entry.name)) continue;
    const candidate = `${parent}/${entry.name}`;
    if (await isPackageRoot(root, candidate)) out.push(candidate);
  }
  return out.sort();
}

function cleanWorkspacePattern(pattern: string): string | undefined {
  const cleaned = pattern
    .trim()
    .replaceAll("\\", "/")
    .replace(/\/+/g, "/")
    .replace(/\/$/g, "")
    .replace(/^\.\//, "");
  if (!cleaned || cleaned.startsWith("!")) return undefined;
  if (cleaned.split("/").some(shouldSkipDir)) return undefined;
  return cleaned;
}

async function isPackageRoot(root: string, path: string): Promise<boolean> {
  const abs = resolve(root, path);
  if (!isInsideRoot(root, abs)) return false;
  if (path.split("/").some(shouldSkipDir)) return false;
  try {
    const s = await stat(join(abs, PACKAGE_JSON));
    return s.isFile();
  } catch {
    return false;
  }
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
