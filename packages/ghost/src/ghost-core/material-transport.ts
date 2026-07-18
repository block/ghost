import { readdir, readFile, realpath, stat } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import { TextDecoder } from "node:util";
import { hasGlobMagic, matchesGlob, normalizeGlobPath } from "./glob.js";
import { classifyMaterialLocator } from "./materials.js";

export type TransportedMaterialTier = "bundled" | "referenced" | "url";

export interface TransportedMaterial {
  locator: string;
  tier: TransportedMaterialTier;
  /** Repo-relative concrete file path, when the locator resolved to a file. */
  path?: string;
  inlined?: string;
  omitted?: true;
  reason?: string;
}

export interface MaterialTransportOptions {
  repoRoot: string;
  packageDir: string;
  materialsDir?: string;
  globCap?: number;
  referencedInlineBytes?: number;
}

export interface MaterialTransportResult {
  materials: TransportedMaterial[];
  inlined: number;
  omitted: number;
}

export interface ExpandedLocalMaterialLocator {
  locator: string;
  tier: Exclude<TransportedMaterialTier, "url">;
  pattern: string;
  matches: Array<{ absolutePath: string; repoRelativePath: string }>;
  truncated: boolean;
}

export interface MaterialMimeInfo {
  mime: string;
  contentKind: "text" | "image" | "binary";
}

const DEFAULT_MATERIALS_DIR = "materials";
const DEFAULT_GLOB_CAP = 12;
const DEFAULT_REFERENCED_INLINE_BYTES = 8 * 1024;
const textDecoder = new TextDecoder("utf-8", { fatal: true });

export async function transportMaterials(
  locators: string[] | undefined,
  options: MaterialTransportOptions,
): Promise<MaterialTransportResult> {
  const materials: TransportedMaterial[] = [];
  let inlined = 0;
  let omitted = 0;

  for (const locator of locators ?? []) {
    const classified = classifyMaterialLocator(locator);
    if (classified.kind === "url") {
      materials.push({
        locator,
        tier: "url",
        omitted: true,
        reason: "HTTPS URL; fetch it only if the task requires it",
      });
      omitted += 1;
      continue;
    }

    const expanded = await expandLocalMaterialLocator(locator, options, {
      cap: options.globCap ?? DEFAULT_GLOB_CAP,
    });
    const globbed = hasGlobMagic(locator);
    if (expanded.matches.length === 0) {
      materials.push({
        locator,
        tier: expanded.tier,
        omitted: true,
        reason: "matched no local files",
      });
      omitted += 1;
      continue;
    }

    for (const match of expanded.matches) {
      const transported = await transportFile(
        globbed ? match.repoRelativePath : locator,
        match,
        expanded.tier,
        options,
      );
      materials.push(transported);
      if (transported.inlined !== undefined) inlined += 1;
      if (transported.omitted) omitted += 1;
    }

    if (expanded.truncated) {
      materials.push({
        locator,
        tier: expanded.tier,
        omitted: true,
        reason: `glob matched more than ${options.globCap ?? DEFAULT_GLOB_CAP} files; omitted the rest`,
      });
      omitted += 1;
    }
  }

  return { materials, inlined, omitted };
}

export async function expandLocalMaterialLocator(
  locator: string,
  options: MaterialTransportOptions,
  expandOptions: { cap?: number } = {},
): Promise<ExpandedLocalMaterialLocator> {
  const resolved = resolveLocalMaterialLocator(locator, options);
  const cap = expandOptions.cap ?? Number.POSITIVE_INFINITY;

  if (!hasGlobMagic(locator)) {
    const absolutePath = resolve(options.repoRoot, resolved.pattern);
    try {
      const s = await stat(absolutePath);
      return {
        locator,
        tier: resolved.tier,
        pattern: resolved.pattern,
        matches: s.isFile()
          ? [{ absolutePath, repoRelativePath: resolved.pattern }]
          : [],
        truncated: false,
      };
    } catch {
      return {
        locator,
        tier: resolved.tier,
        pattern: resolved.pattern,
        matches: [],
        truncated: false,
      };
    }
  }

  const base = globLiteralBase(resolved.pattern);
  const baseAbs = resolve(options.repoRoot, base);
  const found: Array<{ absolutePath: string; repoRelativePath: string }> = [];
  await walkFiles(baseAbs, options.repoRoot, found, cap + 1, resolved.pattern);

  return {
    locator,
    tier: resolved.tier,
    pattern: resolved.pattern,
    matches: found.slice(0, cap),
    truncated: found.length > cap,
  };
}

export async function listBundledMaterialFiles(
  options: MaterialTransportOptions,
): Promise<string[]> {
  const materialsDir = options.materialsDir ?? DEFAULT_MATERIALS_DIR;
  const bundledDir = join(options.packageDir, materialsDir);
  const files: Array<{ absolutePath: string; repoRelativePath: string }> = [];
  await walkFiles(
    bundledDir,
    options.repoRoot,
    files,
    Number.POSITIVE_INFINITY,
  );
  return files.map((file) => file.repoRelativePath).sort();
}

export function materialLocatorClaimsPath(
  locator: string,
  repoRelativePath: string,
  options: MaterialTransportOptions,
): boolean {
  if (classifyMaterialLocator(locator).kind === "url") return false;
  const resolved = resolveLocalMaterialLocator(locator, options);
  const normalizedPath = normalizeGlobPath(repoRelativePath);
  return hasGlobMagic(locator)
    ? matchesGlob(resolved.pattern, normalizedPath)
    : resolved.pattern === normalizedPath;
}

export function resolveLocalMaterialLocator(
  locator: string,
  options: MaterialTransportOptions,
): {
  tier: Exclude<TransportedMaterialTier, "url">;
  pattern: string;
} {
  const materialsDir = options.materialsDir ?? DEFAULT_MATERIALS_DIR;
  const normalized = normalizeGlobPath(locator);
  const packageMaterialsDir = resolve(options.packageDir, materialsDir);
  const packageRelative =
    normalized === materialsDir || normalized.startsWith(`${materialsDir}/`);
  const pattern = packageRelative
    ? toRepoRelative(resolve(options.packageDir, normalized), options.repoRoot)
    : normalized;
  const absolutePattern = resolve(options.repoRoot, pattern);
  const tier =
    packageRelative || isInsideOrEqual(absolutePattern, packageMaterialsDir)
      ? "bundled"
      : "referenced";
  return { tier, pattern };
}

async function transportFile(
  locator: string,
  match: { absolutePath: string; repoRelativePath: string },
  tier: Exclude<TransportedMaterialTier, "url">,
  options: MaterialTransportOptions,
): Promise<TransportedMaterial> {
  const lexicalBase = { locator, tier, path: match.repoRelativePath };
  let contained: Awaited<ReturnType<typeof resolveContainedRealFile>>;
  try {
    contained = await resolveContainedRealFile(
      match.absolutePath,
      options.repoRoot,
    );
  } catch {
    return {
      ...lexicalBase,
      omitted: true as const,
      reason: "matched file could not be read",
    };
  }
  if (contained === null) {
    return {
      ...lexicalBase,
      omitted: true as const,
      reason: "resolved material path escapes repo",
    };
  }

  const base = { locator, tier, path: contained.repoRelativePath };
  let s: Awaited<ReturnType<typeof stat>>;
  try {
    s = await stat(contained.realPath);
  } catch {
    return {
      ...base,
      omitted: true as const,
      reason: "matched file could not be read",
    };
  }

  if (!s.isFile()) {
    return { ...base, omitted: true as const, reason: "not a file" };
  }

  const inlineLimit =
    options.referencedInlineBytes ?? DEFAULT_REFERENCED_INLINE_BYTES;
  if (tier === "referenced" && s.size > inlineLimit) {
    return {
      ...base,
      omitted: true as const,
      reason: `exceeds ${formatBytes(inlineLimit)} inline limit`,
    };
  }

  let buffer: Buffer;
  try {
    buffer = await readFile(contained.realPath);
  } catch {
    return {
      ...base,
      omitted: true as const,
      reason: "matched file could not be read",
    };
  }

  if (isBinaryMaterial(buffer)) {
    return {
      ...base,
      omitted: true as const,
      reason: "binary inspect-pointer",
    };
  }

  try {
    return { ...base, inlined: textDecoder.decode(buffer) };
  } catch {
    return { ...base, omitted: true as const, reason: "not valid UTF-8 text" };
  }
}

async function walkFiles(
  dir: string,
  repoRoot: string,
  files: Array<{ absolutePath: string; repoRelativePath: string }>,
  limit: number,
  glob?: string,
): Promise<void> {
  if (files.length >= limit) return;

  let entries: Array<{
    name: string;
    isDirectory: () => boolean;
    isFile: () => boolean;
  }>;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (files.length >= limit) return;
    if (entry.name === ".git") continue;
    const absolutePath = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkFiles(absolutePath, repoRoot, files, limit, glob);
      continue;
    }
    if (!entry.isFile()) continue;
    const repoRelativePath = toRepoRelative(absolutePath, repoRoot);
    if (glob === undefined || matchesGlob(glob, repoRelativePath)) {
      files.push({ absolutePath, repoRelativePath });
    }
  }
}

function globLiteralBase(pattern: string): string {
  const segments = normalizeGlobPath(pattern).split("/");
  const literal: string[] = [];
  for (const segment of segments) {
    if (hasGlobMagic(segment)) break;
    literal.push(segment);
  }
  const base = literal.join("/");
  return base === "" ? "." : base;
}

function toRepoRelative(path: string, repoRoot: string): string {
  const rel = relative(repoRoot, path);
  return normalizeGlobPath(rel === "" ? "." : rel);
}

export async function resolveContainedRealFile(
  absolutePath: string,
  repoRoot: string,
): Promise<{ realPath: string; repoRelativePath: string } | null> {
  const realRepoRoot = await realpath(repoRoot);
  const realPath = await realpath(absolutePath);
  if (!isInsideOrEqual(realPath, realRepoRoot)) return null;

  return {
    realPath,
    repoRelativePath: toRepoRelative(realPath, realRepoRoot),
  };
}

export function inferMaterialMime(path: string): MaterialMimeInfo {
  const lower = path.toLowerCase();
  let mime = "application/octet-stream";
  if (lower.endsWith(".png")) mime = "image/png";
  else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg"))
    mime = "image/jpeg";
  else if (lower.endsWith(".gif")) mime = "image/gif";
  else if (lower.endsWith(".webp")) mime = "image/webp";
  else if (lower.endsWith(".svg")) mime = "image/svg+xml";
  else if (lower.endsWith(".css")) mime = "text/css";
  else if (lower.endsWith(".html") || lower.endsWith(".htm"))
    mime = "text/html";
  else if (lower.endsWith(".json")) mime = "application/json";
  else if (lower.endsWith(".md") || lower.endsWith(".markdown"))
    mime = "text/markdown";
  else if (lower.endsWith(".txt")) mime = "text/plain";
  else if (
    lower.endsWith(".js") ||
    lower.endsWith(".mjs") ||
    lower.endsWith(".ts") ||
    lower.endsWith(".tsx")
  ) {
    mime = "text/plain";
  }

  return {
    mime,
    contentKind: isTextMime(mime)
      ? "text"
      : mime.startsWith("image/")
        ? "image"
        : "binary",
  };
}

export function isBinaryMaterial(buffer: Buffer): boolean {
  return buffer.includes(0);
}

export function isTextMime(mime: string): boolean {
  return (
    mime.startsWith("text/") ||
    mime === "application/json" ||
    mime === "image/svg+xml"
  );
}

function isInsideOrEqual(child: string, parent: string): boolean {
  const rel = relative(parent, child);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function formatBytes(bytes: number): string {
  return bytes % 1024 === 0 ? `${bytes / 1024} KB` : `${bytes} bytes`;
}
