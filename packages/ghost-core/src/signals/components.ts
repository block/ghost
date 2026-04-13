import type { SampledMaterial } from "../types.js";

/**
 * Extract architecture signals from component files:
 * methodology detection, naming patterns, and component count.
 */
export function extractComponentSignals(material: SampledMaterial): {
  methodologySignals: string[];
  componentNames: string[];
} {
  const methodologies = new Set<string>();
  const componentNames: string[] = [];

  for (const file of material.files) {
    const name = file.path.toLowerCase();
    const content = file.content;

    // Collect component names from file paths
    if (name.endsWith(".tsx") || name.endsWith(".jsx") || name.endsWith(".vue") || name.endsWith(".svelte")) {
      const baseName = file.path.split("/").pop()?.replace(/\.\w+$/, "");
      if (baseName && !baseName.startsWith("index") && !baseName.startsWith("_")) {
        componentNames.push(baseName);
      }
    }
    if (name.endsWith(".swift")) {
      const baseName = file.path.split("/").pop()?.replace(/\.swift$/, "");
      if (baseName && !baseName.startsWith("_")) {
        componentNames.push(baseName);
      }
    }

    // Methodology detection from imports and patterns
    if (/from\s+['"].*\.module\.(?:css|scss)['"]/.test(content)) {
      methodologies.add("css-modules");
    }
    if (/import\s+styled\s+from\s+['"]styled-components['"]/.test(content) || /styled\.\w+`/.test(content)) {
      methodologies.add("styled-components");
    }
    if (/from\s+['"]@emotion\//.test(content) || /css`/.test(content)) {
      methodologies.add("emotion");
    }
    if (/className=.*["'`].*\b(?:flex|grid|p-|m-|bg-|text-|w-|h-)/.test(content)) {
      methodologies.add("tailwind");
    }
    if (/var\(\s*--/.test(content) && (name.endsWith(".css") || name.endsWith(".scss"))) {
      methodologies.add("css-custom-properties");
    }
    if (name.endsWith(".scss")) {
      methodologies.add("scss");
    }
    if (/from\s+['"]@vanilla-extract\//.test(content)) {
      methodologies.add("vanilla-extract");
    }
  }

  return {
    methodologySignals: [...methodologies],
    componentNames,
  };
}
