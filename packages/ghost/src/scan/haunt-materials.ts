import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { splitMarkdownFrontmatter } from "../ghost-core/markdown.js";

/**
 * A haunt inventory material surfaced by `ghost gather`: repo-local building
 * blocks generation may lean on. Only the id (filename minus `.md`) and the
 * frontmatter `description` are read — Ghost never imports Haunt's package
 * code, and nothing from `haunt/checks/` is ever served (checks are feed-back
 * only).
 */
export interface HauntMaterialEntry {
  id: string;
  description?: string;
}

/**
 * Read the materials menu from `<packageDir>/haunt/inventory/*.md`. Returns
 * `undefined` when there is no haunt inventory (absent subtree or empty dir),
 * so callers can omit the section entirely.
 */
export async function loadHauntMaterials(
  packageDir: string,
): Promise<HauntMaterialEntry[] | undefined> {
  const inventoryDir = join(packageDir, "haunt", "inventory");
  let entries: string[];
  try {
    entries = await readdir(inventoryDir);
  } catch {
    return undefined;
  }

  const materials: HauntMaterialEntry[] = [];
  for (const name of entries.sort((a, b) => a.localeCompare(b))) {
    if (!name.endsWith(".md")) continue;
    let raw: string;
    try {
      raw = await readFile(join(inventoryDir, name), "utf-8");
    } catch {
      continue;
    }
    const { frontmatter } = splitMarkdownFrontmatter(raw);
    const description =
      typeof frontmatter?.description === "string"
        ? frontmatter.description
        : undefined;
    materials.push({
      id: name.replace(/\.md$/, ""),
      ...(description !== undefined ? { description } : {}),
    });
  }

  return materials.length > 0 ? materials : undefined;
}
