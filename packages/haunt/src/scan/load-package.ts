import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { parseCheckMarkdown } from "@anarchitecture/ghost-fingerprint/core";
import { parse as parseYaml } from "yaml";
import type { ZodType } from "zod";
import { HauntIdSchema } from "../model/ids.js";
import {
  HauntCheckFrontmatterSchema,
  HauntInventoryFrontmatterSchema,
  HauntPackageManifestSchema,
  HauntSurfaceFrontmatterSchema,
  HauntTenetFrontmatterSchema,
} from "../model/schema.js";
import {
  finalizeReport,
  type HauntLintIssue,
  type HauntLintReport,
  type HauntPackage,
} from "../model/types.js";

export interface LoadPackageResult {
  /** The loaded package, or null when it failed to load (see report). */
  pkg: HauntPackage | null;
  report: HauntLintReport;
}

const MANIFEST_FILE = "manifest.yml";
const CONTENT_TIERS = ["tenets", "inventory", "surfaces", "checks"] as const;

/**
 * Load and per-document-validate a `.haunt/` package from disk. Slice 1: shape
 * only — each tier folder is read *flat* (no recursion, which mechanically
 * enforces "no nesting"), frontmatter is validated per document, and ids are
 * derived from filenames. Cross-tier graph validation (edges resolve, orphans,
 * globs) is `haunt validate` (Slice 2), not here.
 */
export async function loadHauntPackage(
  dir: string,
): Promise<LoadPackageResult> {
  const issues: HauntLintIssue[] = [];

  // --- manifest ---
  let manifest: HauntPackage["manifest"] | null = null;
  try {
    const raw = await readFile(join(dir, MANIFEST_FILE), "utf8");
    const parsed = parseYaml(raw);
    const result = HauntPackageManifestSchema.safeParse(parsed);
    if (result.success) {
      manifest = result.data;
    } else {
      for (const issue of result.error.issues) {
        issues.push({
          severity: "error",
          rule: `manifest/${issue.code}`,
          where: MANIFEST_FILE,
          message: issue.message,
        });
      }
    }
  } catch {
    issues.push({
      severity: "error",
      rule: "manifest/missing",
      where: MANIFEST_FILE,
      message: `${MANIFEST_FILE} not found — is this a .haunt/ package?`,
    });
  }

  const tenets = await loadTier(
    dir,
    "tenets",
    HauntTenetFrontmatterSchema,
    issues,
  );
  const inventory = await loadTier(
    dir,
    "inventory",
    HauntInventoryFrontmatterSchema,
    issues,
  );
  const surfaces = await loadTier(
    dir,
    "surfaces",
    HauntSurfaceFrontmatterSchema,
    issues,
  );
  const checks = await loadTier(
    dir,
    "checks",
    HauntCheckFrontmatterSchema,
    issues,
  );
  const exemplars = await loadExemplars(dir);

  const report = finalizeReport(issues);
  if (manifest === null || report.errors > 0) {
    return { pkg: null, report };
  }

  return {
    pkg: {
      manifest,
      tenets,
      inventory,
      surfaces,
      checks,
      exemplars,
    },
    report,
  };
}

/** Read one tier folder flat, parse + validate each `*.md`, index by id. */
async function loadTier<F>(
  dir: string,
  tier: (typeof CONTENT_TIERS)[number],
  schema: ZodType<F>,
  issues: HauntLintIssue[],
): Promise<Map<string, { id: string; frontmatter: F; body: string }>> {
  const out = new Map<string, { id: string; frontmatter: F; body: string }>();
  const entries = await readDirEntries(join(dir, tier));
  for (const entry of entries) {
    if (entry.isDirectory()) {
      issues.push({
        severity: "error",
        rule: "tier/no-nesting",
        where: `${tier}/${entry.name}`,
        message: `Haunt tiers are flat — nested folder '${entry.name}/' is not allowed under ${tier}/.`,
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
        where: `${tier}/${entry.name}`,
        message: idCheck.error.issues[0]?.message ?? "invalid id",
      });
      continue;
    }
    if (out.has(id)) {
      issues.push({
        severity: "error",
        rule: "id/duplicate",
        where: `${tier}/${entry.name}`,
        message: `duplicate id '${id}' in ${tier}/`,
      });
      continue;
    }

    const raw = await readFile(join(dir, tier, entry.name), "utf8");
    const { frontmatter, body } = parseCheckMarkdown(raw);
    if (frontmatter === null) {
      issues.push({
        severity: "error",
        rule: "doc/missing-frontmatter",
        where: `${tier}/${id}`,
        message: "document must begin with a YAML frontmatter block",
      });
      continue;
    }
    const result = schema.safeParse(frontmatter);
    if (!result.success) {
      for (const issue of result.error.issues) {
        issues.push({
          severity: "error",
          rule: `schema/${issue.code}`,
          where: `${tier}/${id}${issue.path.length ? `.${issue.path.join(".")}` : ""}`,
          message: issue.message,
        });
      }
      continue;
    }
    out.set(id, {
      id,
      frontmatter: result.data,
      body: body.replace(/^\n+/, "").replace(/\s+$/, ""),
    });
  }
  return out;
}

/** Exemplars are prose-only (no validated frontmatter in this cut). */
async function loadExemplars(dir: string): Promise<HauntPackage["exemplars"]> {
  const out: HauntPackage["exemplars"] = new Map();
  const entries = await readDirEntries(join(dir, "exemplars"));
  for (const entry of entries) {
    if (entry.isDirectory() || !entry.name.endsWith(".md")) continue;
    const id = basename(entry.name, ".md");
    const raw = await readFile(join(dir, "exemplars", entry.name), "utf8");
    const { body } = parseCheckMarkdown(raw);
    out.set(id, { id, body: body.replace(/^\n+/, "").replace(/\s+$/, "") });
  }
  return out;
}

/** readdir that treats a missing folder as empty (tiers are optional). */
async function readDirEntries(path: string) {
  try {
    return await readdir(path, { withFileTypes: true });
  } catch {
    return [];
  }
}
