import { execFileSync } from "node:child_process";
import { type Dirent, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import type { GitInfo, TopLevelEntry } from "#ghost-core";
import { shouldSkipDir } from "./paths.js";

/** A shallow, signal-rich listing of the root's immediate children. */
export function readTopLevel(root: string): TopLevelEntry[] {
  let entries: Dirent[];
  try {
    entries = readdirSync(root, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: TopLevelEntry[] = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (shouldSkipDir(entry.name)) continue;
      if (entry.name.startsWith(".") && entry.name !== ".") continue;
      let childCount = 0;
      try {
        childCount = readdirSync(join(root, entry.name)).length;
      } catch {
        childCount = 0;
      }
      out.push({
        path: `${entry.name}/`,
        kind: "dir",
        child_count: childCount,
      });
      continue;
    }
    if (entry.isFile()) {
      out.push({ path: entry.name, kind: "file", child_count: 0 });
    }
  }
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

/** Best-effort git remote + default branch (no failure on non-repos). */
export function readGit(root: string): GitInfo {
  if (!isGitRepo(root)) return { remote: null, default_branch: null };
  const remote = tryGit(["config", "--get", "remote.origin.url"], root);
  const defaultBranch =
    parseDefaultBranch(
      tryGit(["symbolic-ref", "refs/remotes/origin/HEAD"], root),
    ) ?? tryGit(["rev-parse", "--abbrev-ref", "HEAD"], root);
  return {
    remote: remote && remote.length > 0 ? remote : null,
    default_branch:
      defaultBranch && defaultBranch.length > 0 ? defaultBranch : null,
  };
}

function isGitRepo(root: string): boolean {
  try {
    return (
      statSync(join(root, ".git")).isDirectory() ||
      statSync(join(root, ".git")).isFile()
    );
  } catch {
    return false;
  }
}

function tryGit(args: string[], cwd: string): string | null {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

function parseDefaultBranch(symbolic: string | null): string | null {
  if (!symbolic) return null;
  const prefix = "refs/remotes/origin/";
  return symbolic.startsWith(prefix) ? symbolic.slice(prefix.length) : null;
}
