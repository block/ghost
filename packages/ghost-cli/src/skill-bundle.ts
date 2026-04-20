/**
 * Ghost's agentskills.io-compatible skill bundle.
 *
 * The bundle's source files live in `src/skill-bundle/` as real markdown
 * and are copied verbatim into `dist/skill-bundle/` by the build step.
 * This loader walks the dist directory at runtime and returns a flat list
 * of files so `ghost emit skill` can write them into a target project.
 *
 * Spec: https://agentskills.io/specification
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

export interface SkillBundleFile {
  /** Path relative to the skill root (e.g. "SKILL.md", "references/schema.md"). */
  path: string;
  content: string;
}

const BUNDLE_ROOT = fileURLToPath(new URL("./skill-bundle", import.meta.url));

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

export function loadSkillBundle(): SkillBundleFile[] {
  const out: SkillBundleFile[] = [];
  walk(BUNDLE_ROOT, BUNDLE_ROOT, out);
  out.sort((a, b) => {
    if (a.path === "SKILL.md") return -1;
    if (b.path === "SKILL.md") return 1;
    return a.path.localeCompare(b.path);
  });
  return out;
}
