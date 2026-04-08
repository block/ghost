/**
 * Extracts CSS variables from main.css and injects them into the
 * registry:base item in registry.json as the `cssVars` field.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postcss from "postcss";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG = join(__dirname, "..");

const css = readFileSync(join(PKG, "src/styles/main.css"), "utf-8");
const root = postcss.parse(css);

const theme = {};
const light = {};
const dark = {};

root.walk((node) => {
  if (node.type !== "decl" || !node.prop.startsWith("--")) return;

  const parent = node.parent;
  if (!parent) return;

  if (parent.type === "atrule" && parent.name === "theme") {
    // Skip wildcard resets like --color-*: initial
    if (node.prop.includes("*")) return;
    theme[node.prop] = node.value;
  } else if (parent.type === "rule" && parent.selector === ":root") {
    light[node.prop] = node.value;
  } else if (parent.type === "rule" && parent.selector === ".dark") {
    dark[node.prop] = node.value;
  }

  // @theme inline declarations also go into theme
  if (
    parent.type === "atrule" &&
    parent.name === "theme" &&
    parent.params?.includes("inline")
  ) {
    theme[node.prop] = node.value;
  }
});

// Read and update registry.json
const registryPath = join(PKG, "registry.json");
const registry = JSON.parse(readFileSync(registryPath, "utf-8"));

// Find or create the registry:base item
let baseItem = registry.items.find(
  (item) => item.type === "registry:base" && item.name === "ghost-ui-base",
);

if (!baseItem) {
  baseItem = {
    name: "ghost-ui-base",
    type: "registry:base",
    title: "Ghost UI",
    description: "ghost design language",
    author: "block",
    style: "ghost",
    iconLibrary: "lucide",
    baseColor: "neutral",
    registryDependencies: ["styles-main", "font-faces", "utils"],
    dependencies: ["tw-animate-css", "clsx", "tailwind-merge"],
    devDependencies: ["tailwindcss"],
    files: [],
    cssVars: {},
  };
  // Insert at the beginning of items (before styles-main)
  registry.items.unshift(baseItem);
}

baseItem.cssVars = { theme, light, dark };

writeFileSync(registryPath, JSON.stringify(registry, null, 2) + "\n");

const counts = {
  theme: Object.keys(theme).length,
  light: Object.keys(light).length,
  dark: Object.keys(dark).length,
};
console.log(
  `Updated ghost-ui-base cssVars: ${counts.theme} theme, ${counts.light} light, ${counts.dark} dark tokens`,
);
