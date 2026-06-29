import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  type GhostCheckDocument,
  lintGhostCheck,
  loadGhostCheck,
} from "#ghost-core";

export const GHOST_CHECKS_DIRNAME = "checks";

export interface LoadedChecksDir {
  checks: GhostCheckDocument[];
  /** Files that failed lint, with their first error message. */
  invalid: Array<{ file: string; message: string }>;
}

/**
 * Load markdown checks from `<packageDir>/checks/*.md`. Each file is linted; a
 * file with lint errors is collected in `invalid` (with its first error) and
 * skipped rather than throwing, so one bad check does not block routing the
 * rest. Absent directory → no checks.
 */
export async function loadChecksDir(
  packageDir: string,
): Promise<LoadedChecksDir> {
  const dir = join(packageDir, GHOST_CHECKS_DIRNAME);
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return { checks: [], invalid: [] };
  }

  const checks: GhostCheckDocument[] = [];
  const invalid: LoadedChecksDir["invalid"] = [];

  for (const name of entries.sort()) {
    if (!name.endsWith(".md")) continue;
    const raw = await readFile(join(dir, name), "utf-8");
    const report = lintGhostCheck(raw);
    if (report.errors > 0) {
      const first = report.issues.find((issue) => issue.severity === "error");
      invalid.push({ file: name, message: first?.message ?? "invalid check" });
      continue;
    }
    checks.push(loadGhostCheck(raw));
  }

  return { checks, invalid };
}
