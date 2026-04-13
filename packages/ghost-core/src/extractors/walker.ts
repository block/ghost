import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import type { ExtractedFile } from "../types.js";

const IGNORE_DIRS = [
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  ".nuxt",
  ".ghost",
  "coverage",
  ".turbo",
  "__pycache__",
  // iOS / Swift
  "DerivedData",
  ".build",
  ".xcarchive",
  "Pods",
  ".swiftpm",
  "xcuserdata",
];

const STYLE_EXTENSIONS = [".css", ".scss", ".less"];
const CONFIG_EXTENSIONS = [".json", ".yaml", ".yml", ".xcconfig"];
const COMPONENT_EXTENSIONS = [".tsx", ".jsx", ".vue", ".svelte", ".swift"];
const SCRIPT_EXTENSIONS = [".ts", ".js", ".mjs", ".cjs"];

const TAILWIND_CONFIG_NAMES = [
  "tailwind.config.ts",
  "tailwind.config.js",
  "tailwind.config.mjs",
  "tailwind.config.cjs",
];

export interface WalkOptions {
  maxFiles?: number;
  ignore?: string[];
  extensions?: string[];
}

/**
 * Walk a directory and collect all files matching given extensions.
 * Skips common non-source directories.
 */
export async function walkDir(
  dir: string,
  extensions: string[],
  maxFiles: number,
  extraIgnore: string[] = [],
): Promise<string[]> {
  const results: string[] = [];
  const ignoreSet = new Set([...IGNORE_DIRS, ...extraIgnore]);

  async function walk(current: string): Promise<void> {
    if (results.length >= maxFiles) return;
    if (!existsSync(current)) return;

    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (results.length >= maxFiles) break;
      const fullPath = join(current, entry.name);

      if (entry.isDirectory()) {
        if (!ignoreSet.has(entry.name)) {
          await walk(fullPath);
        }
      } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
        results.push(fullPath);
      }
    }
  }

  await walk(dir);
  return results;
}

/**
 * Classify a file into an ExtractedFile type based on name/extension and content.
 */
function classifyFile(
  filePath: string,
  content: string,
): ExtractedFile["type"] {
  const name = filePath.split("/").pop() ?? "";

  // Tailwind config
  if (TAILWIND_CONFIG_NAMES.some((n) => name === n)) {
    return "tailwind-config";
  }

  // SCSS
  if (name.endsWith(".scss") || name.endsWith(".less")) {
    return "scss";
  }

  // CSS
  if (name.endsWith(".css")) {
    return "css";
  }

  // Swift files
  if (name.endsWith(".swift")) {
    return "swift";
  }

  // xcconfig files
  if (name.endsWith(".xcconfig")) {
    return "xcconfig";
  }

  // JSON files — sniff content for token formats
  if (name.endsWith(".json")) {
    // Asset catalog color sets (inside .xcassets directories)
    if (filePath.includes(".xcassets") && (content.includes('"color-space"') || content.includes('"components"'))) {
      return "xcassets";
    }
    if (content.includes('"$schema"') && content.includes("registry")) {
      return "config";
    }
    if (content.includes('"$value"') && content.includes('"$type"')) {
      // Could be Style Dictionary or W3C
      if (content.includes('"$description"') || content.includes('"$extensions"')) {
        return "w3c-tokens";
      }
      return "style-dictionary";
    }
    return "json-tokens";
  }

  // Components (web frameworks)
  if ([".tsx", ".jsx", ".vue", ".svelte"].some((ext) => name.endsWith(ext))) {
    return "component";
  }

  // Script config files
  if (SCRIPT_EXTENSIONS.some((ext) => name.endsWith(ext))) {
    return "config";
  }

  return "other";
}

/**
 * Universal file walker. Collects all potentially relevant design files
 * from a directory and classifies them.
 */
export async function walkDirectory(
  dir: string,
  options: WalkOptions = {},
): Promise<ExtractedFile[]> {
  const maxFiles = options.maxFiles ?? 100;
  const extraIgnore = options.ignore ?? [];

  const allExtensions = [
    ...STYLE_EXTENSIONS,
    ...CONFIG_EXTENSIONS,
    ...COMPONENT_EXTENSIONS,
    ...SCRIPT_EXTENSIONS,
  ];

  const extensions = options.extensions ?? allExtensions;

  const filePaths = await walkDir(dir, extensions, maxFiles, extraIgnore);
  const files: ExtractedFile[] = [];

  for (const filePath of filePaths) {
    const content = await readFile(filePath, "utf-8");
    const type = classifyFile(filePath, content);

    files.push({
      path: relative(dir, filePath),
      content,
      type,
    });
  }

  return files;
}

/**
 * Walk and categorize files into style, component, and config buckets.
 */
export async function walkAndCategorize(
  dir: string,
  options: WalkOptions = {},
): Promise<{
  styleFiles: ExtractedFile[];
  componentFiles: ExtractedFile[];
  configFiles: ExtractedFile[];
}> {
  const files = await walkDirectory(dir, options);

  const styleFiles: ExtractedFile[] = [];
  const componentFiles: ExtractedFile[] = [];
  const configFiles: ExtractedFile[] = [];

  for (const file of files) {
    switch (file.type) {
      case "css":
      case "scss":
      case "xcassets":
        styleFiles.push(file);
        break;
      case "component":
      case "swift":
        componentFiles.push(file);
        break;
      case "tailwind-config":
      case "config":
      case "json-tokens":
      case "style-dictionary":
      case "w3c-tokens":
      case "figma-variables":
      case "xcconfig":
        configFiles.push(file);
        break;
      default:
        // Skip 'other' and 'documentation' files in categorization
        break;
    }
  }

  return { styleFiles, componentFiles, configFiles };
}
