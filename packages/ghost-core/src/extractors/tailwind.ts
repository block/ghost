import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import type {
  ExtractedFile,
  ExtractedMaterial,
  Extractor,
  ExtractorOptions,
} from "../types.js";

const TAILWIND_CONFIG_PATTERNS = [
  "tailwind.config.ts",
  "tailwind.config.js",
  "tailwind.config.mjs",
  "tailwind.config.cjs",
];

const STYLE_EXTENSIONS = [".css"];
const COMPONENT_EXTENSIONS = [".tsx", ".jsx", ".vue", ".svelte"];
const COMPONENT_DIRS = ["components/ui", "src/components/ui", "src/components"];
const IGNORE_DIRS = ["node_modules", ".git", "dist", "build", ".next", ".nuxt"];

const TAILWIND_INDICATORS = [
  /@tailwind\b/,
  /@theme\b/,
  /@apply\b/,
  /@config\b/,
];

// Matches className="..." or className={...} or class="..."
const CLASS_REGEX =
  /(?:className|class)\s*=\s*(?:"([^"]+)"|'([^']+)'|\{[^}]*["'`]([^"'`]+)["'`])/g;

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

function isTailwindCSS(content: string): boolean {
  return TAILWIND_INDICATORS.some((re) => re.test(content));
}

function extractClassNames(content: string): string[] {
  const classes: string[] = [];
  CLASS_REGEX.lastIndex = 0;
  for (
    let match = CLASS_REGEX.exec(content);
    match !== null;
    match = CLASS_REGEX.exec(content)
  ) {
    const value = match[1] ?? match[2] ?? match[3];
    if (value) {
      classes.push(...value.split(/\s+/).filter(Boolean));
    }
  }
  return classes;
}

function detectComponentLibrary(cwd: string): string | null {
  try {
    const pkgPath = join(cwd, "package.json");
    if (!existsSync(pkgPath)) return null;

    // Synchronous read is fine for a small JSON file during detection
    const raw = require("node:fs").readFileSync(pkgPath, "utf-8");
    const pkg = JSON.parse(raw);
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };

    if (allDeps["@shadcn/ui"] || existsSync(join(cwd, "components.json")))
      return "shadcn";
    if (allDeps["@radix-ui/react-slot"]) return "radix";
    if (allDeps["@chakra-ui/react"]) return "chakra";
    if (allDeps["@mui/material"]) return "mui";
    return null;
  } catch {
    return null;
  }
}

export const tailwindExtractor: Extractor = {
  name: "tailwind",

  async detect(cwd: string): Promise<boolean> {
    // Check for tailwind config files
    for (const pattern of TAILWIND_CONFIG_PATTERNS) {
      if (existsSync(join(cwd, pattern))) return true;
    }

    // Check for @tailwind or @theme directives in CSS files
    const cssFiles = await walkDir(cwd, STYLE_EXTENSIONS, 10);
    for (const file of cssFiles) {
      const content = await readFile(file, "utf-8");
      if (isTailwindCSS(content)) return true;
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
    const configFiles: ExtractedFile[] = [];

    // Gather Tailwind config
    for (const pattern of TAILWIND_CONFIG_PATTERNS) {
      const configPath = join(cwd, pattern);
      if (existsSync(configPath)) {
        const content = await readFile(configPath, "utf-8");
        configFiles.push({
          path: pattern,
          content,
          type: "tailwind-config",
        });
        break;
      }
    }

    // Gather CSS files (prioritize those with Tailwind directives)
    const cssFiles = await walkDir(cwd, STYLE_EXTENSIONS, maxFiles);
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

    let allClassNames: string[] = [];

    for (const dir of searchDirs) {
      const files = await walkDir(dir, COMPONENT_EXTENSIONS, maxFiles);
      for (const file of files) {
        const content = await readFile(file, "utf-8");
        componentFiles.push({
          path: relative(cwd, file),
          content,
          type: "component",
        });
        allClassNames.push(...extractClassNames(content));
      }
    }

    // Deduplicate class names for metadata
    allClassNames = [...new Set(allClassNames)];

    // Count tokens from CSS files
    let tokenCount = 0;
    for (const sf of styleFiles) {
      const matches = sf.content.match(/--[a-zA-Z][\w-]*\s*:/g);
      if (matches) tokenCount += matches.length;
    }

    return {
      styleFiles,
      componentFiles,
      configFiles,
      metadata: {
        framework: "tailwind",
        componentLibrary: detectComponentLibrary(cwd),
        tokenCount,
        componentCount: componentFiles.length,
      },
    };
  },
};
