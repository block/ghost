import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { parse as parseYaml } from "yaml";
import {
  GHOST_HAUNT_MANIFEST_FILENAME,
  type GhostCheckDocument,
  GhostHauntManifestSchema,
  lintGhostCheck,
  loadGhostCheck,
  parseCheckMarkdown,
} from "#ghost-core";

/** Reserved subtree for optional haunts attached to the fingerprint. */
export const GHOST_HAUNTS_DIR = "haunts";

/** First-party haunt ids `ghost haunt add` can scaffold today. */
export const KNOWN_HAUNTS = ["checks"] as const;

const CHECK_ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;

export interface LoadedCheck {
  id: string;
  doc: GhostCheckDocument;
  references: string[];
}

export interface LoadedHauntTree {
  /** Ids of haunts installed under `.ghost/haunts/`, sorted. */
  installed: string[];
  /** Checks from the `checks` haunt; empty when the haunt is absent. */
  checks: Map<string, LoadedCheck>;
  invalid: Array<{ file: string; message: string }>;
}

/**
 * Load the optional `.ghost/haunts/` subtree. A haunt is a directory anchored
 * by a thin `haunt.yml` manifest. Haunts are feed-back capabilities: nothing
 * loaded here is ever served by `gather` or `pull`.
 */
export async function loadHauntTree(
  packageDir: string,
): Promise<LoadedHauntTree> {
  const installed: string[] = [];
  const checks = new Map<string, LoadedCheck>();
  const invalid: LoadedHauntTree["invalid"] = [];
  const hauntsDir = join(packageDir, GHOST_HAUNTS_DIR);

  let entries: Array<{ name: string; isDirectory(): boolean }>;
  try {
    entries = await readdir(hauntsDir, { withFileTypes: true });
  } catch {
    return { installed, checks, invalid };
  }

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name.startsWith(".")) continue;
    if (!entry.isDirectory()) {
      invalid.push({
        file: `haunts/${entry.name}`,
        message: "haunts/ contains only haunt directories",
      });
      continue;
    }

    const hauntDir = join(hauntsDir, entry.name);
    const manifestOk = await lintHauntManifest(entry.name, hauntDir, invalid);
    if (!manifestOk) continue;
    installed.push(entry.name);

    if (entry.name === "checks") {
      await loadChecksHaunt(hauntDir, checks, invalid);
    } else if (!KNOWN_HAUNTS.includes(entry.name as never)) {
      invalid.push({
        file: `haunts/${entry.name}`,
        message: `unknown haunt '${entry.name}' (known haunts: ${KNOWN_HAUNTS.join(", ")})`,
      });
    }
  }

  return { installed, checks, invalid };
}

async function lintHauntManifest(
  id: string,
  hauntDir: string,
  invalid: LoadedHauntTree["invalid"],
): Promise<boolean> {
  const manifestPath = join(hauntDir, GHOST_HAUNT_MANIFEST_FILENAME);
  let raw: string;
  try {
    raw = await readFile(manifestPath, "utf-8");
  } catch {
    invalid.push({
      file: `haunts/${id}`,
      message: `haunt is missing ${GHOST_HAUNT_MANIFEST_FILENAME}`,
    });
    return false;
  }

  let parsed: unknown;
  try {
    parsed = parseYaml(raw);
  } catch (err) {
    invalid.push({
      file: `haunts/${id}/${GHOST_HAUNT_MANIFEST_FILENAME}`,
      message: `haunt.yml is not valid YAML: ${
        err instanceof Error ? err.message : String(err)
      }`,
    });
    return false;
  }

  const result = GhostHauntManifestSchema.safeParse(parsed);
  if (!result.success) {
    invalid.push({
      file: `haunts/${id}/${GHOST_HAUNT_MANIFEST_FILENAME}`,
      message: result.error.issues[0]?.message ?? "invalid haunt manifest",
    });
    return false;
  }
  if (result.data.id !== id) {
    invalid.push({
      file: `haunts/${id}/${GHOST_HAUNT_MANIFEST_FILENAME}`,
      message: `haunt.yml id '${result.data.id}' does not match directory name '${id}'`,
    });
    return false;
  }
  return true;
}

/** Load the flat `*.md` checks inside the `checks` haunt. */
async function loadChecksHaunt(
  hauntDir: string,
  checks: Map<string, LoadedCheck>,
  invalid: LoadedHauntTree["invalid"],
): Promise<void> {
  let entries: Array<{ name: string; isDirectory(): boolean }>;
  try {
    entries = await readdir(hauntDir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name.startsWith(".")) continue;
    if (entry.isDirectory()) {
      invalid.push({
        file: `haunts/checks/${entry.name}`,
        message: "the checks haunt is flat; nested folders are not allowed",
      });
      continue;
    }
    if (!entry.name.endsWith(".md")) continue;

    const id = basename(entry.name, ".md");
    if (!CHECK_ID_PATTERN.test(id)) {
      invalid.push({
        file: `haunts/checks/${entry.name}`,
        message:
          "check id must be a single lowercase slug (a-z, 0-9, '.', '_', '-')",
      });
      continue;
    }

    const raw = await readFile(join(hauntDir, entry.name), "utf-8");
    const lint = lintGhostCheck(raw);
    if (lint.errors > 0) {
      const first = lint.issues.find((issue) => issue.severity === "error");
      invalid.push({
        file: `haunts/checks/${entry.name}`,
        message: first?.message ?? "invalid check",
      });
      continue;
    }

    const { frontmatter } = parseCheckMarkdown(raw);
    const references = referencesFromFrontmatter(frontmatter);
    if (references.length === 0) {
      invalid.push({
        file: `haunts/checks/${entry.name}`,
        message: "check must declare at least one reference in `references`",
      });
      continue;
    }

    checks.set(id, { id, doc: loadGhostCheck(raw), references });
  }
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
