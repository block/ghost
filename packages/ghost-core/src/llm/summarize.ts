import type { ExtractedMaterial } from "../types.js";

/**
 * Pre-summarize extracted material to fit within LLM context budgets.
 * Targets ~3-5K tokens of input by extracting key signals rather than
 * sending raw file contents.
 */
export function summarizeMaterial(material: ExtractedMaterial): string {
  const sections: string[] = [];

  sections.push(`## Project Metadata`);
  sections.push(`Framework: ${material.metadata.framework ?? "unknown"}`);
  sections.push(
    `Component Library: ${material.metadata.componentLibrary ?? "none detected"}`,
  );
  sections.push(`Token Count: ${material.metadata.tokenCount}`);
  sections.push(`Component Count: ${material.metadata.componentCount}`);

  // Summarize CSS tokens and values
  if (material.styleFiles.length > 0) {
    sections.push(`\n## Style Files (${material.styleFiles.length})`);
    for (const file of material.styleFiles) {
      sections.push(`\n### ${file.path}`);
      sections.push(summarizeStyleFile(file.content));
    }
  }

  // Summarize config files
  if (material.configFiles.length > 0) {
    sections.push(`\n## Config Files (${material.configFiles.length})`);
    for (const file of material.configFiles) {
      sections.push(`\n### ${file.path}`);
      // Config files are usually small enough to include
      sections.push(truncate(file.content, 2000));
    }
  }

  // Summarize component files
  if (material.componentFiles.length > 0) {
    sections.push(`\n## Components (${material.componentFiles.length})`);
    for (const file of material.componentFiles) {
      sections.push(`\n### ${file.path}`);
      sections.push(summarizeComponent(file.content));
    }
  }

  return sections.join("\n");
}

function summarizeStyleFile(content: string): string {
  const lines: string[] = [];

  // Extract custom property declarations
  const tokenLines = content.match(/--[\w-]+\s*:\s*[^;]+/g);
  if (tokenLines) {
    lines.push("Custom Properties:");
    for (const line of tokenLines.slice(0, 50)) {
      lines.push(`  ${line.trim()}`);
    }
    if (tokenLines.length > 50) {
      lines.push(`  ... and ${tokenLines.length - 50} more`);
    }
  }

  // Extract @theme blocks
  const themeMatch = content.match(/@theme\s*\{[^}]*\}/s);
  if (themeMatch) {
    lines.push(`\n@theme block:\n${truncate(themeMatch[0], 1000)}`);
  }

  // Extract @tailwind directives
  const tailwindDirectives = content.match(/@tailwind\s+\w+/g);
  if (tailwindDirectives) {
    lines.push(`\nTailwind directives: ${tailwindDirectives.join(", ")}`);
  }

  // Extract @apply usages
  const applyUsages = content.match(/@apply\s+[^;]+/g);
  if (applyUsages) {
    lines.push(`\n@apply usages (${applyUsages.length}):`);
    for (const usage of applyUsages.slice(0, 20)) {
      lines.push(`  ${usage.trim()}`);
    }
  }

  return lines.join("\n") || "(no style signals detected)";
}

function summarizeComponent(content: string): string {
  const lines: string[] = [];

  // Extract className usages
  const classNames = new Set<string>();
  const classRegex =
    /(?:className|class)\s*=\s*(?:"([^"]+)"|'([^']+)'|\{[^}]*["'`]([^"'`]+)["'`])/g;
  for (
    let match = classRegex.exec(content);
    match !== null;
    match = classRegex.exec(content)
  ) {
    const value = match[1] ?? match[2] ?? match[3];
    if (value) {
      for (const cls of value.split(/\s+/)) {
        if (cls) classNames.add(cls);
      }
    }
  }

  if (classNames.size > 0) {
    const sorted = [...classNames].sort();
    lines.push(`Classes (${sorted.length}): ${sorted.slice(0, 30).join(", ")}`);
    if (sorted.length > 30) {
      lines.push(`  ... and ${sorted.length - 30} more`);
    }
  }

  // Extract imports for library detection
  const imports = content.match(/import\s+.*from\s+["'][^"']+["']/g);
  if (imports) {
    lines.push(`Imports: ${imports.slice(0, 10).join("; ")}`);
  }

  // Component signature (function/const name)
  const componentMatch = content.match(
    /(?:export\s+(?:default\s+)?)?(?:function|const)\s+(\w+)/,
  );
  if (componentMatch) {
    lines.push(`Export: ${componentMatch[1]}`);
  }

  // Line count as complexity signal
  const lineCount = content.split("\n").length;
  lines.push(`Lines: ${lineCount}`);

  return lines.join("\n") || "(no signals detected)";
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}\n... (truncated)`;
}
