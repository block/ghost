import { readFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import type { Fingerprint, SemanticColor } from "#ghost-core";
import { computeEmbedding, parseColorToOklch } from "#ghost-core";
import { mergeFingerprint } from "./scan/compose.js";
import { mergeFrontmatter } from "./scan/frontmatter.js";
import { type ParsedFingerprint, parseFingerprint } from "./scan/parser.js";
import { validateFrontmatter } from "./scan/schema.js";

export interface LoadOptions {
  /** Skip `extends:` resolution. Default: false (extends chains are resolved). */
  noExtends?: boolean;
  /**
   * Skip embedding backfill. When true, a missing `embedding` stays empty;
   * useful for read-only tooling (lint, diff-on-disk) that doesn't need
   * the vector.
   */
  noEmbeddingBackfill?: boolean;
}

/**
 * Load a ParsedFingerprint from disk.
 *
 * If the file declares `extends:`, the base fingerprint is loaded recursively and
 * merged per the rules in compose.ts: overlay wins, decisions merged by
 * dimension, palette colors merged by role.
 */
export async function loadFingerprint(
  path: string,
  options: LoadOptions = {},
): Promise<ParsedFingerprint> {
  assertMarkdownPath(path);

  const parsed = options.noExtends
    ? await loadRaw(path)
    : await loadWithExtends(path, new Set());

  // Backfill `oklch` on palette colors that arrived hex-only. Deterministic
  // (same hex -> same oklch), so re-parsing the same fingerprint always
  // yields the same in-memory shape.
  backfillPaletteOklch(parsed.fingerprint);

  if (!options.noEmbeddingBackfill) {
    parsed.fingerprint.embedding = resolveEmbedding(parsed.fingerprint);
  }

  return parsed;
}

function assertMarkdownPath(path: string): void {
  if (!path.endsWith(".md")) {
    throw new Error(
      `Fingerprint files must be Markdown (.md). Got: ${path}. The legacy JSON format has been removed — regenerate by running the fingerprint recipe in your host agent (install with \`ghost skill install\`).`,
    );
  }
}

function backfillPaletteOklch(fingerprint: Fingerprint): void {
  if (!fingerprint.palette) return;
  if (fingerprint.palette.dominant) {
    fingerprint.palette.dominant =
      fingerprint.palette.dominant.map(ensureOklch);
  }
  if (fingerprint.palette.semantic) {
    fingerprint.palette.semantic =
      fingerprint.palette.semantic.map(ensureOklch);
  }
}

function ensureOklch(color: SemanticColor): SemanticColor {
  if (color.oklch && color.oklch.length === 3) return color;
  const oklch = parseColorToOklch(color.value);
  return oklch ? { ...color, oklch } : color;
}

function resolveEmbedding(fingerprint: Fingerprint): number[] {
  if (fingerprint.embedding && fingerprint.embedding.length > 0) {
    return fingerprint.embedding;
  }
  if (
    fingerprint.palette &&
    fingerprint.spacing &&
    fingerprint.typography &&
    fingerprint.surfaces
  ) {
    return computeEmbedding(fingerprint);
  }
  return [];
}

async function loadRaw(path: string): Promise<ParsedFingerprint> {
  assertMarkdownPath(path);
  const raw = await readFile(path, "utf-8");
  return parseFingerprint(raw);
}

async function loadWithExtends(
  path: string,
  visited: Set<string>,
): Promise<ParsedFingerprint> {
  assertMarkdownPath(path);
  const absolute = isAbsolute(path) ? path : resolve(path);
  if (visited.has(absolute)) {
    throw new Error(
      `Cycle detected while resolving extends: chain — ${absolute} visited twice.`,
    );
  }
  visited.add(absolute);

  const raw = await readFile(absolute, "utf-8");
  const overlay = parseFingerprint(raw);
  if (!overlay.meta.extends) {
    return overlay;
  }

  const basePath = resolve(dirname(absolute), overlay.meta.extends);
  const base = await loadWithExtends(basePath, visited);

  const merged = mergeFingerprint(base.fingerprint, overlay.fingerprint);
  validateFrontmatter(mergeFrontmatter(merged));

  const { extends: _dropped, ...overlayMeta } = overlay.meta;
  return {
    fingerprint: merged,
    meta: { ...base.meta, ...overlayMeta },
    body: overlay.body,
    bodyRaw: overlay.bodyRaw,
  };
}
