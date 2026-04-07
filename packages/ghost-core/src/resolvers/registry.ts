import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type {
  CSSToken,
  Registry,
  RegistryItem,
  ResolvedRegistry,
  TokenCategory,
} from "../types.js";
import { parseCSS } from "./css.js";

function isURL(str: string): boolean {
  return str.startsWith("http://") || str.startsWith("https://");
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

async function resolveItemContent(
  item: RegistryItem,
  registryDir: string,
): Promise<RegistryItem> {
  // registry:font items carry structured metadata, not file content
  if (item.type === "registry:font" && item.files.length === 0) {
    return item;
  }

  const resolvedFiles = await Promise.all(
    item.files.map(async (file) => {
      if (file.content) return file;

      // Skip binary files (e.g., woff2 font files)
      if (file.path.match(/\.(woff2?|ttf|otf|eot)$/)) {
        return file;
      }

      // Try built output first: out/r/[name].json
      const builtPath = join(registryDir, "out", "r", `${item.name}.json`);
      if (existsSync(builtPath)) {
        const built = JSON.parse(
          await readFile(builtPath, "utf-8"),
        ) as RegistryItem;
        const builtFile = built.files?.find((f) => f.path === file.path);
        if (builtFile?.content) {
          return { ...file, content: builtFile.content };
        }
      }

      // Fall back to reading source file directly
      const sourcePath = resolve(registryDir, file.path);
      if (existsSync(sourcePath)) {
        const content = await readFile(sourcePath, "utf-8");
        return { ...file, content };
      }

      return file;
    }),
  );

  return { ...item, files: resolvedFiles };
}

async function resolveItemContentFromURL(
  item: RegistryItem,
  baseURL: string,
): Promise<RegistryItem> {
  const allFilesHaveContent = item.files.every((f) => f.content);
  if (allFilesHaveContent) return item;

  try {
    const itemURL = `${baseURL}/r/${item.name}.json`;
    const built = await fetchJSON<RegistryItem>(itemURL);
    const contentMap = new Map(
      built.files?.map((f) => [f.path, f.content]) ?? [],
    );

    const resolvedFiles = item.files.map((file) => {
      if (file.content) return file;
      const content = contentMap.get(file.path);
      return content ? { ...file, content } : file;
    });

    return { ...item, files: resolvedFiles };
  } catch {
    return item;
  }
}

function extractCSSVarsTokens(
  vars: Record<string, string>,
  selector: string,
): CSSToken[] {
  // Build a synthetic CSS string and parse it to reuse categorization logic
  const lines = Object.entries(vars).map(([k, v]) => `  ${k}: ${v};`);
  const css = `${selector} {\n${lines.join("\n")}\n}`;
  return parseCSS(css);
}

function extractFontTokens(items: RegistryItem[]): CSSToken[] {
  const tokens: CSSToken[] = [];
  for (const item of items) {
    if (item.type !== "registry:font" || !item.font) continue;
    tokens.push({
      name: item.font.variable,
      value: item.font.family,
      resolvedValue: item.font.family,
      selector: ":root",
      category: "font" as TokenCategory,
    });
    if (item.font.weight) {
      tokens.push({
        name: `${item.font.variable}-weights`,
        value: item.font.weight.join(", "),
        resolvedValue: item.font.weight.join(", "),
        selector: ":root",
        category: "font-face" as TokenCategory,
      });
    }
  }
  return tokens;
}

function extractStyleTokens(items: RegistryItem[]): CSSToken[] {
  const tokens: CSSToken[] = [];

  // Extract from registry:style items (CSS file content)
  for (const item of items) {
    if (item.type !== "registry:style") continue;
    for (const file of item.files) {
      if (
        file.content &&
        (file.path.endsWith(".css") || file.type === "registry:theme")
      ) {
        tokens.push(...parseCSS(file.content));
      }
    }
  }

  // Extract from registry:base items (cssVars maps)
  for (const item of items) {
    if (item.type !== "registry:base" || !item.cssVars) continue;
    if (item.cssVars.theme) {
      tokens.push(...extractCSSVarsTokens(item.cssVars.theme, "@theme"));
    }
    if (item.cssVars.light) {
      tokens.push(...extractCSSVarsTokens(item.cssVars.light, ":root"));
    }
    if (item.cssVars.dark) {
      tokens.push(...extractCSSVarsTokens(item.cssVars.dark, ".dark"));
    }
  }

  // Extract from registry:font items
  tokens.push(...extractFontTokens(items));

  return tokens;
}

export async function resolveRegistry(
  registryPath: string,
): Promise<ResolvedRegistry> {
  if (isURL(registryPath)) {
    return resolveRemoteRegistry(registryPath);
  }
  return resolveLocalRegistry(registryPath);
}

async function resolveLocalRegistry(
  registryPath: string,
): Promise<ResolvedRegistry> {
  const fullPath = resolve(registryPath);
  const registryDir = dirname(fullPath);

  const raw = JSON.parse(await readFile(fullPath, "utf-8")) as Registry;

  const items = await Promise.all(
    raw.items.map((item) => resolveItemContent(item, registryDir)),
  );

  const tokens = extractStyleTokens(items);

  return {
    name: raw.name,
    homepage: raw.homepage,
    items,
    tokens,
  };
}

async function resolveRemoteRegistry(
  registryURL: string,
): Promise<ResolvedRegistry> {
  const raw = await fetchJSON<Registry>(registryURL);

  // Derive base URL: if URL is https://example.com/r/registry.json -> https://example.com
  // If URL is https://example.com/registry.json -> https://example.com
  const urlObj = new URL(registryURL);
  const baseURL = `${urlObj.origin}${urlObj.pathname.replace(/\/r?\/registry\.json$/, "")}`;

  const items = await Promise.all(
    raw.items.map((item) => resolveItemContentFromURL(item, baseURL)),
  );

  const tokens = extractStyleTokens(items);

  return {
    name: raw.name,
    homepage: raw.homepage,
    items,
    tokens,
  };
}
