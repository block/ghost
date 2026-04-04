import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type {
  CSSToken,
  Registry,
  RegistryItem,
  ResolvedRegistry,
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
  const resolvedFiles = await Promise.all(
    item.files.map(async (file) => {
      if (file.content) return file;

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

function extractStyleTokens(items: RegistryItem[]): CSSToken[] {
  for (const item of items) {
    if (item.type !== "registry:style") continue;
    for (const file of item.files) {
      if (
        file.content &&
        (file.path.endsWith(".css") || file.type === "registry:theme")
      ) {
        return parseCSS(file.content);
      }
    }
  }
  return [];
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
