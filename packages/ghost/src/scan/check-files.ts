import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import {
  type GhostCheckDocument,
  lintGhostCheck,
  loadGhostCheck,
  parseCheckMarkdown,
} from "#ghost-core";

/** Reserved package-root directory holding review checks. */
export const GHOST_CHECKS_DIR = "checks";

/** Pre-flat location for checks; detected only to warn on stale packages. */
const LEGACY_HAUNTS_DIR = "haunts";

const CHECK_ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;

export interface LoadedCheck {
  id: string;
  doc: GhostCheckDocument;
  references: string[];
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

  await detectLegacyHauntsDir(packageDir, invalid);

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

    const { frontmatter } = parseCheckMarkdown(raw);
    const references = referencesFromFrontmatter(frontmatter);
    if (references.length === 0) {
      invalid.push({
        file: `checks/${entry.name}`,
        message: "check must declare at least one reference in `references`",
      });
      continue;
    }

    checks.set(id, { id, doc: loadGhostCheck(raw), references });
  }

  return { hasChecksDir: true, checks, invalid };
}

async function detectLegacyHauntsDir(
  packageDir: string,
  invalid: LoadedCheckFiles["invalid"],
): Promise<void> {
  try {
    await readdir(join(packageDir, LEGACY_HAUNTS_DIR));
  } catch {
    return;
  }
  invalid.push({
    file: LEGACY_HAUNTS_DIR,
    message:
      "the haunts/ directory is no longer supported; move haunts/checks/*.md to checks/ and delete haunts/",
  });
}

function referencesFromFrontmatter(
  frontmatter: Record<string, unknown> | null,
): string[] {
  if (frontmatter === null) return [];
  if (Array.isArray(frontmatter.references)) {
    return frontmatter.references.filter(
      (reference): reference is string => typeof reference === "string",
    );
  }
  // Deprecated compatibility for single-file linting; package checks should use
  // `references`, but this keeps older check files loadable during local edits.
  return typeof frontmatter.source === "string" ? [frontmatter.source] : [];
}
