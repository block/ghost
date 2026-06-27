import { readFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { parse as parseYaml } from "yaml";
import {
  type BindingCandidate,
  GHOST_BINDING_FILENAME,
  GHOST_SURFACES_YML_FILENAME,
  GhostBindingSchema,
  GhostSurfacesSchema,
} from "#ghost-core";
import { FINGERPRINT_PACKAGE_DIR } from "./constants.js";
import { resolveGitRoot } from "./package-paths.js";

export interface DiscoverBindingsOptions {
  ghostDir?: string;
}

export interface DiscoveredBindings {
  repo_root: string;
  target_path: string;
  candidates: BindingCandidate[];
  /** True when the repo root has a `<ghostDir>/surfaces.yml` (a root contract). */
  hasRootContract: boolean;
}

/**
 * Walk from the repo root down to the directory containing `targetPath`,
 * collecting binding candidates at each level:
 *
 * - directory-implied: a scoped `<ghostDir>/surfaces.yml` binds its declared
 *   non-`core` surfaces to that directory's subtree;
 * - explicit: a `.ghost.bind.yml` at that level binds the surfaces it names.
 *
 * No ranking here — that is `resolvePathToSurface`'s job. This only reads the
 * filesystem and produces candidates.
 */
export async function discoverBindingsForPath(
  targetPath: string,
  cwd = process.cwd(),
  options: DiscoverBindingsOptions = {},
): Promise<DiscoveredBindings> {
  const repoRoot = await resolveGitRoot(cwd);
  const ghostDir = options.ghostDir ?? FINGERPRINT_PACKAGE_DIR;
  const target = isAbsolute(targetPath) ? targetPath : resolve(cwd, targetPath);

  // Directories from repo root down to the file's directory, inclusive.
  const dirs = directoriesFromRootToTarget(repoRoot, target);

  const candidates: BindingCandidate[] = [];
  let hasRootContract = false;

  for (const dir of dirs) {
    const relDir = posixRelative(repoRoot, dir);

    // Directory-implied binding from a scoped surfaces.yml.
    const surfacesPath = resolve(dir, ghostDir, GHOST_SURFACES_YML_FILENAME);
    const surfaceIds = await readSurfaceIds(surfacesPath);
    if (surfaceIds !== null) {
      if (relDir === "") hasRootContract = true;
      const bound = surfaceIds.filter((id) => id !== "core");
      if (relDir !== "" && bound.length > 0) {
        candidates.push({
          dir: relDir,
          explicit: false,
          entries: bound.map((surface) => ({ surface, paths: [relDir] })),
        });
      }
    }

    // Explicit binding.
    const explicitPath = resolve(dir, GHOST_BINDING_FILENAME);
    const explicit = await readExplicitBinding(explicitPath);
    if (explicit) {
      candidates.push({
        dir: relDir,
        explicit: true,
        entries: explicit,
      });
    }
  }

  return {
    repo_root: repoRoot,
    target_path: posixRelative(repoRoot, target),
    candidates,
    hasRootContract,
  };
}

async function readSurfaceIds(path: string): Promise<string[] | null> {
  let raw: string;
  try {
    raw = await readFile(path, "utf-8");
  } catch {
    return null;
  }
  const result = GhostSurfacesSchema.safeParse(parseYaml(raw));
  if (!result.success) return null;
  return result.data.surfaces.map((surface) => surface.id);
}

async function readExplicitBinding(path: string) {
  let raw: string;
  try {
    raw = await readFile(path, "utf-8");
  } catch {
    return null;
  }
  const result = GhostBindingSchema.safeParse(parseYaml(raw));
  if (!result.success) return null;
  return result.data.bindings.map((entry) => ({
    surface: entry.surface,
    paths: entry.paths,
  }));
}

function directoriesFromRootToTarget(
  repoRoot: string,
  target: string,
): string[] {
  const dirs: string[] = [];
  // Start at the target's directory (a file path) — but the target may itself be
  // a directory; we conservatively include it and walk up to the root.
  let current = target;
  // If target looks like a file (has an extension), start at its directory.
  if (/\.[^/\\]+$/.test(target)) current = dirname(target);
  while (isWithinOrEqual(repoRoot, current)) {
    dirs.push(current);
    if (current === repoRoot) break;
    current = dirname(current);
  }
  return dirs.reverse(); // root first
}

function isWithinOrEqual(root: string, candidate: string): boolean {
  const rel = relative(root, candidate);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function posixRelative(root: string, target: string): string {
  const rel = relative(root, target);
  return rel.split(sep).join("/");
}
