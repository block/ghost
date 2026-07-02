import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import {
  type GhostCheckFrontmatter,
  lintGhostCheck,
  loadGhostCheck,
  parseCheckMarkdown,
} from "@anarchitecture/ghost-fingerprint/core";
import { HauntIdSchema } from "../model/ids.js";
import {
  HauntCheckReferencesSchema,
  HauntInventoryFrontmatterSchema,
} from "../model/schema.js";
import {
  finalizeReport,
  type HauntCheck,
  type HauntInventory,
  type HauntLintIssue,
  type HauntLintReport,
  type HauntPackage,
} from "../model/types.js";

export interface LoadPackageResult {
  /** The loaded package, or null when it failed to load (see report). */
  pkg: HauntPackage | null;
  report: HauntLintReport;
}

/** Directories from the retired four-tier shape — warn if any linger. */
const LEGACY_DIRS = ["tenets", "surfaces", "exemplars"] as const;

/**
 * Load and per-document-validate a `.ghost/haunt/` package from disk:
 * `inventory/` (own frontmatter schema) + `checks/` (`ghost.check/v1`, linted
 * by ghost-core, plus the haunt-side `references` lint). Haunt has no
 * manifest — the fingerprint's `manifest.yml` is the only anchor; the haunt
 * package is just the `haunt/` dir. Each dir is read *flat* (no recursion,
 * which mechanically enforces "no nesting"). Cross-reference resolution
 * (local + fingerprint) is `ghost-haunt validate`'s job, not here.
 */
export async function loadHauntPackage(
  dir: string,
): Promise<LoadPackageResult> {
  const issues: HauntLintIssue[] = [];

  if (!existsSync(dir)) {
    issues.push({
      severity: "error",
      rule: "package/missing",
      where: "haunt/",
      message: `${dir} not found — run \`ghost-haunt init\` to scaffold the .ghost/haunt/ package`,
    });
    return { pkg: null, report: finalizeReport(issues) };
  }

  const inventory = await loadInventory(dir, issues);
  const checks = await loadChecks(dir, issues);

  // --- leftover dirs from the retired four-tier shape ---
  for (const legacy of LEGACY_DIRS) {
    if ((await readDirEntries(join(dir, legacy))).length > 0) {
      issues.push({
        severity: "warning",
        rule: "package/legacy-dir",
        where: `${legacy}/`,
        message: `'${legacy}/' is no longer part of the haunt shape — brand truths live in .ghost/ as fingerprint nodes; remove or migrate this directory`,
      });
    }
  }

  // --- legacy standalone .haunt/ as a sibling of the .ghost/ dir ---
  // `dir` is `<ghost dir>/haunt`, so the legacy location is two levels up.
  const legacyHaunt = resolve(dir, "..", "..", ".haunt");
  if (existsSync(legacyHaunt)) {
    issues.push({
      severity: "warning",
      rule: "package/legacy-haunt-dir",
      where: ".haunt/",
      message:
        "found legacy `.haunt/` — haunt now lives at `.ghost/haunt/`; move inventory/ and checks/ there and delete `.haunt/` (its manifest.yml is no longer needed)",
    });
  }

  const report = finalizeReport(issues);
  if (report.errors > 0) {
    return { pkg: null, report };
  }

  return { pkg: { inventory, checks }, report };
}

/** Read a flat dir of `*.md`, enforcing flat slugs and no nesting. */
async function readDocs(
  dir: string,
  sub: "inventory" | "checks",
  issues: HauntLintIssue[],
): Promise<Array<{ id: string; raw: string }>> {
  const out: Array<{ id: string; raw: string }> = [];
  const seen = new Set<string>();
  const entries = await readDirEntries(join(dir, sub));
  for (const entry of entries) {
    if (entry.isDirectory()) {
      issues.push({
        severity: "error",
        rule: "dir/no-nesting",
        where: `${sub}/${entry.name}`,
        message: `Haunt dirs are flat — nested folder '${entry.name}/' is not allowed under ${sub}/.`,
      });
      continue;
    }
    if (!entry.name.endsWith(".md")) continue;
    const id = basename(entry.name, ".md");
    const idCheck = HauntIdSchema.safeParse(id);
    if (!idCheck.success) {
      issues.push({
        severity: "error",
        rule: "id/invalid",
        where: `${sub}/${entry.name}`,
        message: idCheck.error.issues[0]?.message ?? "invalid id",
      });
      continue;
    }
    if (seen.has(id)) continue;
    seen.add(id);
    const raw = await readFile(join(dir, sub, entry.name), "utf8");
    out.push({ id, raw });
  }
  return out;
}

async function loadInventory(
  dir: string,
  issues: HauntLintIssue[],
): Promise<Map<string, HauntInventory>> {
  const out = new Map<string, HauntInventory>();
  for (const { id, raw } of await readDocs(dir, "inventory", issues)) {
    const { frontmatter, body } = parseCheckMarkdown(raw);
    if (frontmatter === null) {
      issues.push({
        severity: "error",
        rule: "doc/missing-frontmatter",
        where: `inventory/${id}`,
        message: "document must begin with a YAML frontmatter block",
      });
      continue;
    }
    const result = HauntInventoryFrontmatterSchema.safeParse(frontmatter);
    if (!result.success) {
      for (const issue of result.error.issues) {
        issues.push({
          severity: "error",
          rule: `schema/${issue.code}`,
          where: `inventory/${id}${issue.path.length ? `.${issue.path.join(".")}` : ""}`,
          message: issue.message,
        });
      }
      continue;
    }
    out.set(id, { id, frontmatter: result.data, body: trimBody(body) });
  }
  return out;
}

async function loadChecks(
  dir: string,
  issues: HauntLintIssue[],
): Promise<Map<string, HauntCheck>> {
  const out = new Map<string, HauntCheck>();
  for (const { id, raw } of await readDocs(dir, "checks", issues)) {
    // ghost-core owns the check contract (`name`/`description`/`severity`).
    const lint = lintGhostCheck(raw);
    for (const issue of lint.issues) {
      issues.push({
        severity: issue.severity,
        rule: issue.rule,
        where: `checks/${id}${issue.path ? `.${issue.path}` : ""}`,
        message: issue.message,
      });
    }
    if (lint.errors > 0) continue;

    // The haunt-side addition: `references`, required, min 1.
    const { frontmatter } = parseCheckMarkdown(raw);
    const refsResult = HauntCheckReferencesSchema.safeParse(
      frontmatter?.references,
    );
    if (!refsResult.success) {
      issues.push({
        severity: "error",
        rule: "check/references-missing",
        where: `checks/${id}.references`,
        message:
          refsResult.error.issues[0]?.message ??
          "a check must declare at least one reference",
      });
      continue;
    }

    const doc = loadGhostCheck(raw);
    out.set(id, {
      id,
      frontmatter: doc.frontmatter as GhostCheckFrontmatter,
      references: refsResult.data,
      body: trimBody(doc.body),
    });
  }
  return out;
}

function trimBody(body: string): string {
  return body.replace(/^\n+/, "").replace(/\s+$/, "");
}

/** readdir that treats a missing folder as empty (dirs are optional). */
async function readDirEntries(path: string) {
  try {
    return await readdir(path, { withFileTypes: true });
  } catch {
    return [];
  }
}
