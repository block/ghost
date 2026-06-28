import { type Dirent, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  CONVENTIONAL_WORKSPACE_DIRS,
  PACKAGE_MANIFEST_NAMES,
  PACKAGE_MANIFEST_PATTERNS,
} from "./constants.js";
import {
  basenameOf,
  isInsideRoot,
  shouldSkipDir,
  toPosixRel,
} from "./paths.js";

/**
 * Collect package manifests from the root plus identifiable workspace dirs
 * (`package.json:workspaces` + the conventional apps/packages/libs/common
 * layout). Root manifests are returned by basename; nested ones as POSIX
 * relative paths. Deduped by absolute path, sorted. One level deep only.
 */
export function collectAllManifests(root: string): string[] {
  const seenAbs = new Set<string>();
  const out: string[] = [];

  for (const name of collectManifestBasenames(root)) {
    const abs = join(root, name);
    if (seenAbs.has(abs)) continue;
    seenAbs.add(abs);
    out.push(name);
  }

  for (const dir of expandWorkspaceDirs(root)) {
    const absDir = resolve(root, dir);
    if (!isInsideRoot(absDir, root)) continue;
    if (shouldSkipDir(basenameOf(absDir))) continue;
    let entries: Dirent[];
    try {
      entries = readdirSync(absDir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (!isManifestName(entry.name)) continue;
      const abs = join(absDir, entry.name);
      if (seenAbs.has(abs)) continue;
      seenAbs.add(abs);
      out.push(toPosixRel(root, abs));
    }
  }

  return out.sort();
}

function collectManifestBasenames(dir: string): string[] {
  let entries: Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const found: string[] = [];
  for (const entry of entries) {
    if (entry.isFile() && isManifestName(entry.name)) found.push(entry.name);
  }
  return found.sort();
}

function isManifestName(name: string): boolean {
  if ((PACKAGE_MANIFEST_NAMES as readonly string[]).includes(name)) return true;
  for (const pattern of PACKAGE_MANIFEST_PATTERNS) {
    if (pattern.test(name)) return true;
  }
  return false;
}

/**
 * Resolve workspace directories to scan (one level only) — POSIX relative
 * paths, never the root itself. Honors `package.json:workspaces` (array or
 * `{ packages: [] }`) and the conventional apps/packages/libs/common layout.
 */
function expandWorkspaceDirs(root: string): string[] {
  const dirs = new Set<string>();

  for (const dir of readPackageJsonWorkspaces(root)) dirs.add(dir);

  for (const parent of CONVENTIONAL_WORKSPACE_DIRS) {
    let entries: Dirent[];
    try {
      entries = readdirSync(join(root, parent), { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (shouldSkipDir(entry.name)) continue;
      if (entry.name.startsWith(".")) continue;
      dirs.add(`${parent}/${entry.name}`);
    }
  }

  return [...dirs].sort();
}

function readPackageJsonWorkspaces(root: string): string[] {
  let raw: string;
  try {
    raw = readFileSync(join(root, "package.json"), "utf-8");
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
  const patterns = normalizeWorkspacePatterns(
    (parsed as { workspaces?: unknown }).workspaces,
  );
  if (patterns.length === 0) return [];

  const out = new Set<string>();
  for (const pattern of patterns) {
    for (const dir of expandWorkspacePattern(root, pattern)) out.add(dir);
  }
  return [...out];
}

function normalizeWorkspacePatterns(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string");
  }
  if (value && typeof value === "object") {
    const obj = value as { packages?: unknown };
    if (Array.isArray(obj.packages)) {
      return obj.packages.filter((v): v is string => typeof v === "string");
    }
  }
  return [];
}

/**
 * Tiny single-segment glob matcher: `packages/*`, `apps/*`, or an exact
 * `tools/foo` path. Multi-segment globs (`**`) are deliberately unsupported.
 */
function expandWorkspacePattern(root: string, pattern: string): string[] {
  const cleaned = pattern.replace(/\\/g, "/").replace(/\/+$/, "");
  if (cleaned.length === 0) return [];
  if (!cleaned.includes("*")) {
    const abs = join(root, cleaned);
    try {
      if (statSync(abs).isDirectory()) return [cleaned];
    } catch {
      // missing dir — skip
    }
    return [];
  }

  const lastSlash = cleaned.lastIndexOf("/");
  if (lastSlash === -1) return [];
  const parent = cleaned.slice(0, lastSlash);
  const tail = cleaned.slice(lastSlash + 1);
  if (tail !== "*") return [];

  let entries: Dirent[];
  try {
    entries = readdirSync(join(root, parent), { withFileTypes: true });
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (shouldSkipDir(entry.name)) continue;
    if (entry.name.startsWith(".")) continue;
    out.push(`${parent}/${entry.name}`);
  }
  return out;
}
