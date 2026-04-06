import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import type {
  ExtractedFile,
  ExtractedMaterial,
  Extractor,
  ExtractorOptions,
} from "../types.js";

const CSS_EXTENSIONS = [".css"];
const COMPONENT_EXTENSIONS = [".tsx", ".jsx", ".vue", ".svelte"];
const COMPONENT_DIRS = ["components/ui", "src/components/ui", "src/components"];
const IGNORE_DIRS = ["node_modules", ".git", "dist", "build", ".next", ".nuxt"];

async function walkDir(
  dir: string,
  extensions: string[],
  maxFiles: number,
): Promise<string[]> {
  const results: string[] = [];

  async function walk(current: string): Promise<void> {
    if (results.length >= maxFiles) return;
    if (!existsSync(current)) return;

    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (results.length >= maxFiles) break;
      const fullPath = join(current, entry.name);

      if (entry.isDirectory()) {
        if (!IGNORE_DIRS.includes(entry.name)) {
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

function hasCustomProperties(content: string): boolean {
  return /--[a-zA-Z][\w-]*\s*:/.test(content);
}

export const cssExtractor: Extractor = {
  name: "css",

  async detect(cwd: string): Promise<boolean> {
    const cssFiles = await walkDir(cwd, CSS_EXTENSIONS, 5);
    for (const file of cssFiles) {
      const content = await readFile(file, "utf-8");
      if (hasCustomProperties(content)) return true;
    }
    return false;
  },

  async extract(
    cwd: string,
    options?: ExtractorOptions,
  ): Promise<ExtractedMaterial> {
    const maxFiles = options?.maxFiles ?? 50;
    const styleFiles: ExtractedFile[] = [];
    const componentFiles: ExtractedFile[] = [];

    // Gather CSS files
    const cssFiles = await walkDir(cwd, CSS_EXTENSIONS, maxFiles);
    for (const file of cssFiles) {
      const content = await readFile(file, "utf-8");
      styleFiles.push({
        path: relative(cwd, file),
        content,
        type: "css",
      });
    }

    // Gather component files
    const componentDir = options?.componentDir
      ? join(cwd, options.componentDir)
      : null;

    const searchDirs = componentDir
      ? [componentDir]
      : COMPONENT_DIRS.map((d) => join(cwd, d)).filter(existsSync);

    for (const dir of searchDirs) {
      const files = await walkDir(dir, COMPONENT_EXTENSIONS, maxFiles);
      for (const file of files) {
        const content = await readFile(file, "utf-8");
        componentFiles.push({
          path: relative(cwd, file),
          content,
          type: "component",
        });
      }
    }

    // Count tokens from CSS files
    let tokenCount = 0;
    for (const sf of styleFiles) {
      const matches = sf.content.match(/--[a-zA-Z][\w-]*\s*:/g);
      if (matches) tokenCount += matches.length;
    }

    return {
      styleFiles,
      componentFiles,
      configFiles: [],
      metadata: {
        framework: "css",
        componentLibrary: null,
        tokenCount,
        componentCount: componentFiles.length,
      },
    };
  },
};
