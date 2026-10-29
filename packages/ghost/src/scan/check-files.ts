import { readdir, readFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { YAMLParseError } from "yaml";
import {
  type GhostCatalog,
  type GhostCheckDocument,
  lintGhostCheck,
  loadGhostCheck,
  parseCheckMarkdown,
  parseCheckReference,
  sliceNodeSection,
} from "#ghost-core";
import { isMissingPathError } from "../internal/fs.js";
import type { LintIssue } from "./lint.js";

/** Reserved package-root directory holding review checks. */
export const GHOST_CHECKS_DIR = "checks";

const CHECK_ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;

export interface LoadedCheck {
  id: string;
  /** Absolute owning package, populated by the package loader. */
  packageDir?: string;
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

export function lintCheckReferences(
  catalog: GhostCatalog,
  checks: Map<string, LoadedCheck>,
  issues: LintIssue[],
  externalPackageDir?: string,
  brandCheck = false,
): void {
  for (const check of checks.values()) {
    const file = `checks/${check.id}.md`;
    const path = externalPackageDir ? resolve(externalPackageDir, file) : file;
    if (check.usesDeprecatedSource) {
      issues.push({
        severity: "warning",
        rule: "check-source-deprecated",
        message:
          "`source` is deprecated; replace it with `references:\n  - <node-id>`",
        path: `${path}.source`,
      });
    }
    for (const raw of check.references) {
      const parsed = parseCheckReference(raw);
      if (parsed === null) {
        issues.push({
          severity: "error",
          rule: "check-reference-malformed",
          message: `check reference '${raw}' is not a node id with optional '> Heading' anchor`,
          path: `${path}.references`,
        });
        continue;
      }
      const node = catalog.nodes.get(parsed.nodeId);
      if (brandCheck && node?.scope === "baseline")
        issues.push({
          severity: "warning",
          rule: "check-reference-baseline-owned",
          message: `Brand check references baseline guidance '${raw}'; keep checks in the package that owns the guidance.`,
          path: `${path}.references`,
        });
      if (node === undefined) {
        issues.push({
          severity: "warning",
          rule: "check-reference-unresolved",
          message: `check reference '${raw}' does not resolve to a ghost package node — if you pruned this rule from the node, delete its paired flag in the check too`,
          path: `${path}.references`,
        });
        continue;
      }
      if (
        parsed.heading !== undefined &&
        sliceNodeSection(node.body, parsed.heading) === null
      ) {
        issues.push({
          severity: "warning",
          rule: "check-reference-heading-missing",
          message: `check reference '${raw}' names a heading that was not found — if you pruned this rule from the node, delete its paired flag in the check too`,
          path: `${path}.references`,
        });
      }
    }
  }
}
