/**
 * Generic loader for an agentskills.io-compatible skill bundle.
 *
 * Each tool in the Ghost monorepo (`ghost-drift`, `ghost-expression`, …) ships
 * its own skill bundle as real markdown under `src/skill-bundle/` and copies
 * it verbatim to `dist/skill-bundle/` at build time. This loader walks any
 * given root directory and returns a flat, deterministically ordered list of
 * files so each tool's `emit skill` verb can write them into a target project.
 *
 * Spec: https://agentskills.io/specification
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

export interface SkillBundleFile {
  /** Path relative to the skill root (e.g. "SKILL.md", "references/schema.md"). */
  path: string;
  content: string;
}

function walk(dir: string, root: string, out: SkillBundleFile[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const absolute = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(absolute, root, out);
      continue;
    }
    if (!entry.isFile()) continue;
    out.push({
      path: relative(root, absolute),
      content: readFileSync(absolute, "utf-8"),
    });
  }
}

/**
 * Load a skill bundle from disk.
 *
 * `bundleRoot` should point to a directory containing at least a `SKILL.md`
 * file at the top level (typically `dist/skill-bundle/` after the host
 * package's build step has copied the markdown sources from `src/`).
 *
 * The returned list is sorted with `SKILL.md` first, then alphabetically.
 */
export function loadSkillBundle(bundleRoot: string): SkillBundleFile[] {
  const out: SkillBundleFile[] = [];
  walk(bundleRoot, bundleRoot, out);
  out.sort((a, b) => {
    if (a.path === "SKILL.md") return -1;
    if (b.path === "SKILL.md") return 1;
    return a.path.localeCompare(b.path);
  });
  return out;
}
