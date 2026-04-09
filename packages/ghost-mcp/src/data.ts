import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const assetsDir = path.resolve(__dirname, "assets");

export interface RegistryFile {
  type: string;
  target: string;
  path: string;
}

export interface RegistryCssVars {
  theme?: Record<string, string>;
  light?: Record<string, string>;
  dark?: Record<string, string>;
}

export interface RegistryItem {
  name: string;
  type: string;
  title?: string;
  description?: string;
  author?: string;
  style?: string;
  iconLibrary?: string;
  baseColor?: string;
  dependencies?: string[];
  devDependencies?: string[];
  registryDependencies?: string[];
  files: RegistryFile[];
  categories?: string[];
  cssVars?: RegistryCssVars;
}

export interface Registry {
  $schema: string;
  name: string;
  homepage: string;
  items: RegistryItem[];
}

const registryRaw = fs.readFileSync(
  path.join(assetsDir, "registry.json"),
  "utf-8",
);
const registry: Registry = JSON.parse(registryRaw);

const skillsContent = fs.readFileSync(
  path.join(assetsDir, "skills.md"),
  "utf-8",
);

const itemsByName = new Map<string, RegistryItem>();
for (const item of registry.items) {
  itemsByName.set(item.name, item);
}

export interface ItemSummary {
  name: string;
  type: string;
  categories: string[];
  dependencies: string[];
  registryDependencies: string[];
  description?: string;
}

export function searchItems(
  query?: string,
  category?: string,
  aiOnly?: boolean,
): ItemSummary[] {
  let items = registry.items;

  if (category) {
    const lower = category.toLowerCase();
    items = items.filter((i) =>
      (i.categories ?? []).some((c) => c.toLowerCase() === lower),
    );
  }

  if (aiOnly) {
    items = items.filter((i) => (i.categories ?? []).includes("ai"));
  }

  if (query) {
    const lower = query.toLowerCase();
    items = items.filter((i) => i.name.toLowerCase().includes(lower));
  }

  return items.map((i) => ({
    name: i.name,
    type: i.type,
    categories: i.categories ?? [],
    dependencies: i.dependencies ?? [],
    registryDependencies: i.registryDependencies ?? [],
    description: i.description,
  }));
}

export function getRegistryItem(name: string): RegistryItem | undefined {
  return itemsByName.get(name);
}

export function getCategoriesWithCounts(): Record<
  string,
  { name: string; count: number }
> {
  const result: Record<string, { name: string; count: number }> = {};
  for (const item of registry.items) {
    for (const cat of item.categories ?? []) {
      if (result[cat]) {
        result[cat].count++;
      } else {
        result[cat] = { name: cat, count: 1 };
      }
    }
  }
  return result;
}

export function getThemePreset(
  name: string,
): RegistryCssVars | undefined {
  const item = registry.items.find(
    (i) => i.type === "registry:theme" && i.name === name,
  );
  return item?.cssVars;
}

export function getComponentSource(name: string): string | null {
  const item = itemsByName.get(name);
  if (!item || item.files.length === 0) return null;

  const filePath = item.files[0].path;
  const ghostUiDir = path.resolve(__dirname, "../../ghost-ui");
  const fullPath = path.join(ghostUiDir, filePath);

  try {
    return fs.readFileSync(fullPath, "utf-8");
  } catch {
    return null;
  }
}

export function getSkills(): string {
  return skillsContent;
}
