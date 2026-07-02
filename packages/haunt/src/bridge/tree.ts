import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { HauntPackage } from "../model/types.js";
import { matchesGlob } from "./glob.js";

const execFileAsync = promisify(execFile);

/**
 * Enumerate the repo's tracked files via `git ls-files`: tracked files only,
 * gitignore respected, repo-rooted relative paths — the same path shape
 * `matchesGlob` already receives from diffs. Errors clearly when `cwd` is not
 * inside a git repository.
 */
export async function listRepoFiles(cwd: string): Promise<string[]> {
  let stdout: string;
  try {
    ({ stdout } = await execFileAsync(
      "git",
      ["ls-files", "--full-name", "-z"],
      { cwd, maxBuffer: 64 * 1024 * 1024 },
    ));
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(
      `cannot enumerate the repo tree: 'git ls-files' failed in ${cwd} — is this a git repository?\n${detail}`,
    );
  }
  return stdout.split("\0").filter((p) => p.length > 0);
}

/**
 * Partition the repo tree by inventory `paths`: material id → the repo files
 * its globs match. Every material appears in the result — a material whose
 * globs match zero files partitions to an empty list, which feeds the
 * `dead-paths` gap downstream.
 */
export function partitionInventory(
  pkg: HauntPackage,
  files: readonly string[],
): Map<string, string[]> {
  const partition = new Map<string, string[]>();
  for (const inv of pkg.inventory.values()) {
    const globs = inv.frontmatter.paths ?? [];
    const hits = files.filter((f) => globs.some((g) => matchesGlob(g, f)));
    partition.set(inv.id, hits);
  }
  return partition;
}
