/**
 * Generates .shadcn/skills.md — agent-friendly metadata about ghost-ui.
 * Reads registry.json + component sources to extract metadata for AI agents.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG = join(__dirname, "..");

// Read registry
const registry = JSON.parse(readFileSync(join(PKG, "registry.json"), "utf-8"));

// Extract component metadata from source files
function extractComponentMeta(item) {
  const meta = {
    name: item.name,
    categories: item.categories || [],
    dependencies: item.dependencies || [],
    registryDependencies: item.registryDependencies || [],
    exports: [],
    variants: [],
    dataSlots: [],
  };

  for (const file of item.files) {
    const sourcePath = join(PKG, file.path);
    if (!existsSync(sourcePath) || !file.path.endsWith(".tsx")) continue;

    try {
      const content = readFileSync(sourcePath, "utf-8");

      // Extract exports
      const exportMatches = content.matchAll(
        /export\s+(?:function|const)\s+(\w+)/g,
      );
      for (const match of exportMatches) {
        meta.exports.push(match[1]);
      }

      // Extract CVA variants
      const cvaMatch = content.match(
        /cva\([^)]*\{[\s\S]*?variants:\s*\{([\s\S]*?)\}\s*\}/,
      );
      if (cvaMatch) {
        const variantBlock = cvaMatch[1];
        const variantNames = variantBlock.matchAll(/(\w+):\s*\{/g);
        for (const v of variantNames) {
          const name = v[1];
          // Extract options for this variant
          const optionRegex = new RegExp(`${name}:\\s*\\{([\\s\\S]*?)\\}`);
          const optionMatch = variantBlock.match(optionRegex);
          if (optionMatch) {
            const options = [];
            const optMatches = optionMatch[1].matchAll(/(\w+):/g);
            for (const o of optMatches) {
              options.push(o[1]);
            }
            meta.variants.push({ name, options });
          }
        }
      }

      // Extract data-slot attributes
      const slotMatches = content.matchAll(/data-slot="([^"]+)"/g);
      for (const match of slotMatches) {
        if (!meta.dataSlots.includes(match[1])) {
          meta.dataSlots.push(match[1]);
        }
      }
    } catch {
      // Skip unreadable files
    }
  }

  return meta;
}

// Gather all UI component metadata
const uiItems = registry.items.filter((i) => i.type === "registry:ui");
const componentMetas = uiItems.map(extractComponentMeta);

// Build category index
const categories = {};
for (const meta of componentMetas) {
  for (const cat of meta.categories) {
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(meta.name);
  }
}

// Read main.css token summary
const mainCSS = readFileSync(join(PKG, "src/styles/main.css"), "utf-8");
const tokenCount = (mainCSS.match(/--[\w-]+:/g) || []).length;

// Read theme presets
let presetSummary = "";
try {
  const { createJiti } = await import("jiti");
  const jiti = createJiti(import.meta.url);
  const { PRESETS } = await jiti.import(join(PKG, "src/lib/theme-presets.ts"));
  presetSummary = PRESETS.map(
    (p) => `- **${p.name}** (${p.id}): ${p.description}`,
  ).join("\n");
} catch {
  presetSummary =
    "- Default, Warm Sand, Ocean, Midnight Luxe, Neon Brutalist, Soft Pastel";
}

// Generate the skills markdown
const componentTable = componentMetas
  .map((m) => {
    const variants = m.variants
      .map((v) => `${v.name}(${v.options.join("|")})`)
      .join(", ");
    const slots = m.dataSlots.join(", ");
    return `| ${m.name} | ${m.categories.join(", ")} | ${m.exports.join(", ")} | ${variants || "-"} | ${slots || "-"} |`;
  })
  .join("\n");

const markdown = `# Ghost UI — Agent Skills

## Overview

Ghost UI is a magazine-inspired design system built on shadcn/ui with:
- **Pill geometry**: 999px border-radius on buttons, inputs, and pills
- **HK Grotesk typography**: Self-hosted, 7 weights (300-900), magazine-scale heading hierarchy
- **4-tier shadow hierarchy**: mini, card, elevated, modal
- **${uiItems.length} components** across ${Object.keys(categories).length} categories
- **${tokenCount}+ CSS custom properties** with full light/dark mode support

## Style: ghost

This registry uses the \`ghost\` style. Components use CVA (class-variance-authority) for variants and \`data-slot\` attributes for runtime introspection.

## Token System

Semantic layers:
- **Backgrounds**: \`--background-default\`, \`--background-alt\`, \`--background-muted\`, \`--background-inverse\`, \`--background-accent\`, \`--background-danger/success/info/warning\`
- **Borders**: \`--border-default\`, \`--border-input\`, \`--border-strong\`, \`--border-card\`, \`--border-accent\`
- **Text**: \`--text-default\`, \`--text-muted\`, \`--text-alt\`, \`--text-inverse\`, \`--text-accent\`
- **Shadows**: \`--shadow-mini\`, \`--shadow-card\`, \`--shadow-elevated\`, \`--shadow-modal\`
- **Radii**: \`--radius-pill\` (999px), \`--radius-button\` (999px), \`--radius-card\` (20px), \`--radius-modal\` (16px)

Typography scale (magazine rhythm):
- Display: clamp(64px, 8vw, 96px), weight 900
- Section: clamp(44px, 5vw, 64px), weight 700
- Sub: clamp(28px, 3vw, 40px), weight 700
- Card: clamp(20px, 2vw, 28px), weight 600
- Body reading: clamp(1rem, 1.3vw, 1.25rem), line-height 1.65
- Label: 11px, uppercase, 0.12em letter-spacing

## Theme Presets

${presetSummary}

## Categories

${Object.entries(categories)
  .map(([cat, components]) => `- **${cat}**: ${components.join(", ")}`)
  .join("\n")}

## Component Reference

| Component | Categories | Exports | Variants | Data Slots |
|-----------|-----------|---------|----------|------------|
${componentTable}

## Usage Patterns

### ThemeProvider
\`\`\`tsx
import { ThemeProvider } from "@/lib/theme-provider"
<ThemeProvider defaultTheme="system" storageKey="theme">
  {children}
</ThemeProvider>
\`\`\`

### Import Aliases
- \`@/components/ui/*\` — UI primitives
- \`@/components/ai-elements/*\` — AI-native components
- \`@/lib/utils\` — \`cn()\` utility (clsx + tailwind-merge)
- \`@/lib/theme-provider\` — ThemeProvider context

### Icon Library
Uses \`lucide-react\` for all icons.

### Dark Mode
Toggle via \`.dark\` class on \`document.documentElement\`. ThemeProvider handles this automatically.
`;

// Write output
const outputDir = join(PKG, ".shadcn");
if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });
writeFileSync(join(outputDir, "skills.md"), markdown);

console.log(
  `Generated .shadcn/skills.md: ${uiItems.length} components, ${Object.keys(categories).length} categories`,
);
