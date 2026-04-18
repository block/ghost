import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, relative, resolve } from "node:path";
import type { CollectedFile } from "../types.js";

const REVIEWABLE_EXTENSIONS = new Set([
  ".tsx",
  ".jsx",
  ".vue",
  ".svelte",
  ".css",
  ".scss",
  ".html",
]);

function isReviewable(filePath: string): boolean {
  return REVIEWABLE_EXTENSIONS.has(extname(filePath));
}

/**
 * Collect files from explicit paths, reading their content.
 * Filters to reviewable extensions only.
 */
export async function collectFiles(
  paths: string[],
  cwd: string,
): Promise<CollectedFile[]> {
  const results: CollectedFile[] = [];

  for (const p of paths) {
    const abs = resolve(cwd, p);
    if (!existsSync(abs) || !isReviewable(p)) continue;

    const content = await readFile(abs, "utf-8");
    results.push({
      path: relative(cwd, abs),
      content,
    });
  }

  return results;
}

/**
 * Parse git diff hunk headers to extract changed line numbers.
 * Hunk format: @@ -oldStart,oldCount +newStart,newCount @@
 * We want the new-side (+) line ranges.
 */
function parseChangedLines(diffOutput: string): Map<string, Set<number>> {
  const fileLines = new Map<string, Set<number>>();
  let currentFile: string | null = null;

  for (const line of diffOutput.split("\n")) {
    // Detect file header: +++ b/path/to/file
    if (line.startsWith("+++ b/")) {
      currentFile = line.slice(6);
      if (!fileLines.has(currentFile)) {
        fileLines.set(currentFile, new Set());
      }
      continue;
    }

    // Parse hunk header: @@ -a,b +c,d @@
    if (currentFile && line.startsWith("@@")) {
      const match = line.match(/@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
      if (match) {
        const start = Number(match[1]);
        const count = match[2] !== undefined ? Number(match[2]) : 1;
        const lines = fileLines.get(currentFile) ?? new Set<number>();
        for (let i = start; i < start + count; i++) {
          lines.add(i);
        }
      }
    }
  }

  return fileLines;
}

/**
 * Collect changed files from git diff.
 * Returns files with their content and the specific lines that changed.
 */
export async function collectGitDiff(options: {
  cwd: string;
  base?: string;
  staged?: boolean;
}): Promise<CollectedFile[]> {
  const { cwd, base, staged } = options;

  // Build the diff command
  const diffRef = staged ? "--staged" : base ? `${base}` : "HEAD";
  const nameArgs = staged ? "--staged" : base ? `${base}` : "HEAD";

  // Get list of changed files (Added, Copied, Modified, Renamed — not Deleted)
  let changedFilesRaw: string;
  try {
    changedFilesRaw = execSync(
      `git diff --name-only --diff-filter=ACMR ${nameArgs}`,
      { cwd, encoding: "utf-8" },
    ).trim();
  } catch {
    // No git repo or no changes — return empty
    return [];
  }

  if (!changedFilesRaw) return [];

  const changedFiles = changedFilesRaw
    .split("\n")
    .filter((f) => f && isReviewable(f));

  if (changedFiles.length === 0) return [];

  // Get unified diff with zero context lines for precise line tracking
  let diffOutput: string;
  try {
    diffOutput = execSync(`git diff -U0 ${diffRef}`, {
      cwd,
      encoding: "utf-8",
    });
  } catch {
    diffOutput = "";
  }

  const lineMap = parseChangedLines(diffOutput);

  // Read file contents and build results
  const results: CollectedFile[] = [];
  for (const filePath of changedFiles) {
    const abs = resolve(cwd, filePath);
    if (!existsSync(abs)) continue;

    const content = await readFile(abs, "utf-8");
    results.push({
      path: filePath,
      content,
      changedLines: lineMap.get(filePath),
    });
  }

  return results;
}
