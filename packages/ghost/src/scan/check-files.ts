import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { YAMLParseError } from "yaml";
import {
  type GhostCheckDocument,
  lintGhostCheck,
  loadGhostCheck,
  parseCheckMarkdown,
} from "#ghost-core";

import { isMissingPathError } from "../internal/fs.js";

/** Reserved package-root directory holding review checks. */
export const GHOST_CHECKS_DIR = "checks";

const CHECK_ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;

export interface LoadedCheck {
  id: string;
  doc: GhostCheckDocument;
  references: string[];
  usesDeprecatedSource: boolean;
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
  } catch (err) {
    if (isMissingPathError(err)) {
      return { hasChecksDir: false, checks, invalid };
    }
    throw new Error(
      `Cannot read checks directory "${checksDir}": ${err instanceof Error ? err.message : String(err)}. Check the path and directory permissions, then retry.`,
      { cause: err },
    );
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
    let lint: ReturnType<typeof lintGhostCheck>;
    try {
      lint = lintGhostCheck(raw);
    } catch (err) {
      if (!(err instanceof YAMLParseError)) throw err;
      invalid.push({ file: `checks/${entry.name}`, message: err.message });
      continue;
    }
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

    checks.set(id, {
      id,
      doc: loadGhostCheck(raw),
      references,
      usesDeprecatedSource:
        !Array.isArray(frontmatter?.references) &&
        typeof frontmatter?.source === "string",
    });
  }

  return { hasChecksDir: true, checks, invalid };
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
  return typeof frontmatter.source === "string" ? [frontmatter.source] : [];
}
