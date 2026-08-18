import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import {
  type GhostCheckDocument,
  lintGhostCheck,
  loadGhostCheck,
} from "#ghost-core";

/** Reserved package-root directory holding review checks. */
export const GHOST_CHECKS_DIR = "checks";

const CHECK_ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;

export interface LoadedCheck {
  id: string;
  doc: GhostCheckDocument;
}

export interface LoadedCheckFiles {
  /** Whether `.ghost/checks/` exists (even if empty). */
  hasChecksDir: boolean;
  checks: Map<string, LoadedCheck>;
  invalid: Array<{ file: string; message: string }>;
}

/**
 * Load the optional flat `.ghost/checks/` directory. Checks are feed-back
 * only: nothing loaded here is ever served by `gather` or `pull`.
 */
export async function loadCheckFiles(
  packageDir: string,
): Promise<LoadedCheckFiles> {
  const checks = new Map<string, LoadedCheck>();
  const invalid: LoadedCheckFiles["invalid"] = [];

  const checksDir = join(packageDir, GHOST_CHECKS_DIR);
  let entries: Array<{ name: string; isDirectory(): boolean }>;
  try {
    entries = await readdir(checksDir, { withFileTypes: true });
  } catch {
    return { hasChecksDir: false, checks, invalid };
  }

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name.startsWith(".")) continue;
    if (entry.isDirectory()) {
      invalid.push({
        file: `checks/${entry.name}`,
        message: "checks/ is flat; nested directories are not allowed",
      });
      continue;
    }
    if (!entry.name.endsWith(".md")) continue;

    const id = basename(entry.name, ".md");
    if (!CHECK_ID_PATTERN.test(id)) {
      invalid.push({
        file: `checks/${entry.name}`,
        message:
          "check id must be a single lowercase slug (a-z, 0-9, '.', '_', '-')",
      });
      continue;
    }

    const raw = await readFile(join(checksDir, entry.name), "utf-8");
    const lint = lintGhostCheck(raw);
    if (lint.errors > 0) {
      const first = lint.issues.find((issue) => issue.severity === "error");
      invalid.push({
        file: `checks/${entry.name}`,
        message: first?.message ?? "invalid check",
      });
      continue;
    }

    const doc = loadGhostCheck(raw);
    checks.set(id, {
      id,
      doc,
    });
  }

  return { hasChecksDir: true, checks, invalid };
}
