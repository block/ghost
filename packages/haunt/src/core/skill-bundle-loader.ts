/**
 * Copied from `packages/ghost/src/ghost-core/skill-bundle-loader.ts`
 * (standalone-first; see notes/haunt-shape.md → "Standalone-first"). Loads an
 * agentskills.io-compatible bundle: walk a root, return a deterministically
 * ordered flat file list so `haunt skill install` can write it into a project.
 *
 * Spec: https://agentskills.io/specification
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

export interface SkillBundleFile {
  /** Path relative to the skill root (e.g. "SKILL.md", "references/x.md"). */
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

/** Load a skill bundle from disk, `SKILL.md` first then alphabetical. */
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
