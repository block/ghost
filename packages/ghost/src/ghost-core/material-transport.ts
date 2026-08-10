import { readdir, readFile, realpath, stat } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import { TextDecoder } from "node:util";
import {
  classifyMaterialLocator,
  type GhostMaterial,
  normalizeMaterial,
} from "./materials.js";

export type TransportedMaterialTier = "bundled" | "referenced" | "url";

export interface TransportedMaterial {
  locator: string;
  note?: string;
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
  referencedInlineBytes?: number;
}

export interface MaterialTransportResult {
  materials: TransportedMaterial[];
  inlined: number;
  omitted: number;
}

export interface ResolvedLocalMaterialFile {
  locator: string;
  tier: Exclude<TransportedMaterialTier, "url">;
  pattern: string;
  match?: { absolutePath: string; repoRelativePath: string };
}

export interface MaterialMimeInfo {
  mime: string;
  contentKind: "text" | "image" | "binary";
}

const DEFAULT_MATERIALS_DIR = "materials";
const DEFAULT_REFERENCED_INLINE_BYTES = 8 * 1024;
const textDecoder = new TextDecoder("utf-8", { fatal: true });

export async function transportMaterials(
  declarations: GhostMaterial[] | undefined,
  options: MaterialTransportOptions,
): Promise<MaterialTransportResult> {
  const materials: TransportedMaterial[] = [];
  let inlined = 0;
  let omitted = 0;

  for (const declaration of declarations ?? []) {
    const { locator, note } = normalizeMaterial(declaration);
    const annotation = note === undefined ? {} : { note };
    const classified = classifyMaterialLocator(locator);
    if (classified.kind === "url") {
      materials.push({
        locator,
        ...annotation,
        tier: "url",
        omitted: true,
        reason:
          "external locator; use an available host connection if the task requires it",
      });
      omitted += 1;
      continue;
    }

    const resolved = await resolveLocalMaterialFile(locator, options);
    if (resolved.match === undefined) {
      materials.push({
        locator,
        ...annotation,
        tier: resolved.tier,
        omitted: true,
        reason: "matched no local files",
      });
      omitted += 1;
      continue;
    }

    const transported = await transportFile(
      locator,
      resolved.match,
      resolved.tier,
      options,
    );
    if (note !== undefined) transported.note = note;
    materials.push(transported);
    if (transported.inlined !== undefined) inlined += 1;
    if (transported.omitted) omitted += 1;
  }

  return { materials, inlined, omitted };
}

export async function resolveLocalMaterialFile(
  locator: string,
  options: MaterialTransportOptions,
): Promise<ResolvedLocalMaterialFile> {
  const resolved = resolveLocalMaterialLocator(locator, options);
  const absolutePath = resolve(options.repoRoot, resolved.pattern);
  try {
    const s = await stat(absolutePath);
    return {
      locator,
      tier: resolved.tier,
      pattern: resolved.pattern,
      ...(s.isFile()
        ? { match: { absolutePath, repoRelativePath: resolved.pattern } }
        : {}),
    };
  } catch {
    return { locator, tier: resolved.tier, pattern: resolved.pattern };
  }
}

export async function listBundledMaterialFiles(
  options: MaterialTransportOptions,
): Promise<string[]> {
  const materialsDir = options.materialsDir ?? DEFAULT_MATERIALS_DIR;
  const bundledDir = join(options.packageDir, materialsDir);
  const files: Array<{ absolutePath: string; repoRelativePath: string }> = [];
  await walkFiles(bundledDir, options.repoRoot, files);
  return files.map((file) => file.repoRelativePath).sort();
}

export function materialLocatorClaimsPath(
  locator: string,
  repoRelativePath: string,
  options: MaterialTransportOptions,
): boolean {
  if (classifyMaterialLocator(locator).kind === "url") return false;
  const resolved = resolveLocalMaterialLocator(locator, options);
  return resolved.pattern === normalizePath(repoRelativePath);
}

export function resolveLocalMaterialLocator(
  locator: string,
  options: MaterialTransportOptions,
): {
  tier: Exclude<TransportedMaterialTier, "url">;
  pattern: string;
} {
  const materialsDir = options.materialsDir ?? DEFAULT_MATERIALS_DIR;
  const normalized = normalizePath(locator);
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
): Promise<void> {
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
    if (entry.name === ".git") continue;
    const absolutePath = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkFiles(absolutePath, repoRoot, files);
      continue;
    }
    if (!entry.isFile()) continue;
    files.push({
      absolutePath,
      repoRelativePath: toRepoRelative(absolutePath, repoRoot),
    });
  }
}

function toRepoRelative(path: string, repoRoot: string): string {
  const rel = relative(repoRoot, path);
  return normalizePath(rel === "" ? "." : rel);
}

/** Normalize a repo-relative path: forward slashes, no leading `./`. */
function normalizePath(p: string): string {
  return p.replace(/\\/g, "/").replace(/^\.\//, "");
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
