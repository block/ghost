/**
 * Reads theme-presets.ts and generates registry:theme items
 * for each non-default preset, injecting them into registry.json.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG = join(__dirname, "..");

// Use jiti to import the TypeScript module directly
const jiti = createJiti(import.meta.url);
const { PRESETS } = await jiti.import(join(PKG, "src/lib/theme-presets.ts"));

// Read registry.json
const registryPath = join(PKG, "registry.json");
const registry = JSON.parse(readFileSync(registryPath, "utf-8"));

// Remove any existing theme-* items (from previous builds)
registry.items = registry.items.filter(
  (item) => !(item.type === "registry:theme" && item.name.startsWith("theme-")),
);

// Generate registry:theme items for non-default presets
const themeItems = [];
for (const preset of PRESETS) {
  if (preset.id === "default") continue;
  if (
    Object.keys(preset.variables.light).length === 0 &&
    Object.keys(preset.variables.dark).length === 0
  ) {
    continue;
  }

  themeItems.push({
    name: `theme-${preset.id}`,
    type: "registry:theme",
    title: preset.name,
    description: preset.description,
    cssVars: {
      light: preset.variables.light,
      dark: preset.variables.dark,
    },
    files: [],
  });
}

// Insert theme items after the base/style/font/utils items (before UI components)
const firstUIIndex = registry.items.findIndex(
  (item) => item.type === "registry:ui",
);
if (firstUIIndex !== -1) {
  registry.items.splice(firstUIIndex, 0, ...themeItems);
} else {
  registry.items.push(...themeItems);
}

writeFileSync(registryPath, JSON.stringify(registry, null, 2) + "\n");

console.log(
  `Generated ${themeItems.length} theme items: ${themeItems.map((t) => t.name).join(", ")}`,
);
