import { GHOST_SURFACE_ROOT_ID } from "../surfaces/types.js";
import type { GhostBindingEntry } from "./types.js";

/**
 * A binding candidate discovered along a path, normalized to a directory depth.
 * `dir` is the POSIX-relative directory (from repo root) the binding governs;
 * deeper dirs are nearer the leaf and win.
 */
export interface BindingCandidate {
  /** POSIX-relative directory the binding sits in (e.g. "apps/checkout"). */
  dir: string;
  /** True for an explicit .ghost.bind.yml, false for directory-implied. */
  explicit: boolean;
  /**
   * The bindings this candidate offers. For directory-implied bindings, this is
   * derived from the scoped package's declared surfaces. For explicit bindings,
   * it is the `.ghost.bind.yml` entries.
   */
  entries: GhostBindingEntry[];
}

export type PathResolutionReason =
  | "explicit"
  | "directory"
  | "root-core"
  | "unbound";

export interface PathResolution {
  /** The resolved surface id, or null when unbound and no root contract. */
  surface: string | null;
  /** Directory of the winning binding, or null when none applied. */
  binding_dir: string | null;
  reason: PathResolutionReason;
}

/**
 * Resolve a repo-relative path to the surface that owns it, deterministically.
 *
 * - Candidates are ranked by directory depth (nearest the leaf wins). At equal
 *   depth, an explicit `.ghost.bind.yml` beats a directory-implied binding.
 * - The winning candidate's entry whose paths match the file names the surface.
 *   A candidate that offers exactly one entry binds unconditionally (the common
 *   directory-default case); when several entries compete, the file must match
 *   an entry's `paths`.
 * - Unbound: `core` when a root contract exists, else null (caller emits menu).
 *
 * No LLM, no I/O. Discovery (walking the tree, reading files) is the caller's
 * job; this is the pure ranking + matching core.
 */
export function resolvePathToSurface(
  path: string,
  candidates: BindingCandidate[],
  options: { hasRootContract: boolean },
): PathResolution {
  const file = normalize(path);

  const ranked = [...candidates].sort((a, b) => {
    const depthA = depthOf(a.dir);
    const depthB = depthOf(b.dir);
    if (depthA !== depthB) return depthB - depthA; // deeper (nearer leaf) first
    if (a.explicit !== b.explicit) return a.explicit ? -1 : 1; // explicit wins
    return 0;
  });

  for (const candidate of ranked) {
    // The candidate only governs files under its directory.
    if (!isUnder(file, candidate.dir)) continue;

    const match = matchEntry(file, candidate);
    if (match) {
      return {
        surface: match,
        binding_dir: candidate.dir,
        reason: candidate.explicit ? "explicit" : "directory",
      };
    }
  }

  if (options.hasRootContract) {
    return {
      surface: GHOST_SURFACE_ROOT_ID,
      binding_dir: null,
      reason: "root-core",
    };
  }
  return { surface: null, binding_dir: null, reason: "unbound" };
}

/**
 * Choose the surface a candidate binds for a file:
 * - one entry → it binds unconditionally (directory-default common case);
 * - many entries → the file must fall under an entry's `paths` (report-don't-
 *   guess: a multi-surface candidate with no path match does not bind).
 */
function matchEntry(file: string, candidate: BindingCandidate): string | null {
  if (candidate.entries.length === 0) return null;
  if (candidate.entries.length === 1 && !candidate.explicit) {
    return candidate.entries[0].surface;
  }
  for (const entry of candidate.entries) {
    for (const pattern of entry.paths) {
      if (matchesPath(file, normalize(pattern))) return entry.surface;
    }
  }
  // A single explicit entry with paths still requires a path match; a single
  // directory-implied entry already returned above.
  if (candidate.entries.length === 1 && candidate.explicit) {
    const entry = candidate.entries[0];
    for (const pattern of entry.paths) {
      if (matchesPath(file, normalize(pattern))) return entry.surface;
    }
  }
  return null;
}

function depthOf(dir: string): number {
  if (dir === "" || dir === ".") return 0;
  return dir.split("/").length;
}

function isUnder(file: string, dir: string): boolean {
  if (dir === "" || dir === ".") return true;
  return file === dir || file.startsWith(`${dir}/`);
}

function matchesPath(file: string, pattern: string): boolean {
  if (pattern.includes("*")) return globToRegExp(pattern).test(file);
  const normalized = pattern.replace(/\/$/, "");
  return file === normalized || file.startsWith(`${normalized}/`);
}

function normalize(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/+$/g, "");
}

function globToRegExp(glob: string): RegExp {
  let out = "^";
  for (let i = 0; i < glob.length; i++) {
    const char = glob[i];
    const next = glob[i + 1];
    if (char === "*" && next === "*") {
      out += ".*";
      i += 1;
    } else if (char === "*") {
      out += "[^/]*";
    } else {
      out += escapeRegExp(char);
    }
  }
  out += "$";
  return new RegExp(out);
}

function escapeRegExp(value: string): string {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}
