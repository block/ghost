import { readFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import type { Fingerprint, SemanticColor } from "@ghost/core";
import { computeEmbedding, parseColorToOklch } from "@ghost/core";
import { mergeFingerprint } from "./compose.js";
import { mergeFrontmatter } from "./frontmatter.js";
import { type ParsedFingerprint, parseFingerprint } from "./parser.js";
import { validateFrontmatter } from "./schema.js";

function assertMarkdownPath(path: string): void {
  if (!path.endsWith(".md")) {
    throw new Error(
      `Fingerprint files must be Markdown (.md). Got: ${path}. The legacy JSON format has been removed — regenerate by running the fingerprint recipe in your host agent (install with \`ghost-scan emit skill\`).`,
    );
  }
}

export type { BodyData } from "./body.js";
export { parseBody } from "./body.js";
export type { DesignDecision } from "./compose.js";
export { mergeFingerprint } from "./compose.js";
export {
  CHECKS_FILENAME,
  FINGERPRINT_FILENAME,
  FINGERPRINT_PACKAGE_DIR,
  FINGERPRINTS_DIRNAME,
  INTENT_FILENAME,
  PATTERNS_FILENAME,
  RESOURCES_FILENAME,
  SCOPE_SURVEYS_DIRNAME,
} from "./constants.js";
// --- Context (review-command + context-bundle) ---
export type {
  ContextFormat,
  EmitReviewInput,
  WriteContextOptions,
  WriteContextResult,
  WritePackageContextOptions,
} from "./context/index.js";
export {
  buildSkillMd,
  buildTokensCss,
  emitReviewCommand,
  writeContextBundle,
  writePackageContextBundle,
} from "./context/index.js";
export type {
  ColorChange,
  DecisionChange,
  SemanticDiff,
  TokenChange,
} from "./diff.js";
export { diffFingerprints, formatSemanticDiff } from "./diff.js";
export type { FingerprintPackagePaths } from "./fingerprint-package.js";
export {
  initFingerprintPackage,
  lintFingerprintPackage,
  resolveFingerprintPackage,
} from "./fingerprint-package.js";
export type {
  LoadedFingerprintNode,
  LoadedFingerprintSet,
  LoadFingerprintSetOptions,
} from "./fingerprint-set.js";
export { loadFingerprintSet } from "./fingerprint-set.js";
export type { FingerprintMeta, FrontmatterData } from "./frontmatter.js";
export { inventory } from "./inventory.js";
export type {
  FingerprintLayout,
  FingerprintLayoutSection,
} from "./layout.js";
export { formatLayout, layoutFingerprint } from "./layout.js";
export type {
  LintIssue,
  LintOptions,
  LintReport,
  LintSeverity,
} from "./lint.js";
export { lintFingerprint } from "./lint.js";
export type {
  MapLintIssue,
  MapLintReport,
  MapLintSeverity,
} from "./lint-map.js";
export { lintMap } from "./lint-map.js";
export type { ParsedFingerprint, ParseOptions } from "./parser.js";
export { parseFingerprint, splitRaw } from "./parser.js";
export type {
  ScanScopeReport,
  ScanStage,
  ScanStageReport,
  ScanStageState,
  ScanStatus,
  ScanStatusOptions,
} from "./scan-status.js";
export { scanStatus } from "./scan-status.js";
export type { FrontmatterShape } from "./schema.js";
export {
  FrontmatterSchema,
  PartialFrontmatterSchema,
  toJsonSchema,
  validateFrontmatter,
} from "./schema.js";
export type {
  VerifyFingerprintIssue,
  VerifyFingerprintOptions,
  VerifyFingerprintReport,
  VerifyFingerprintSeverity,
} from "./verify-fingerprint.js";
export {
  formatVerifyFingerprintReport,
  verifyFingerprint,
} from "./verify-fingerprint.js";
export type { VerifyFingerprintPackageOptions } from "./verify-package.js";
export { verifyFingerprintPackage } from "./verify-package.js";
export type { SerializeOptions } from "./writer.js";
export { serializeFingerprint } from "./writer.js";

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
  // (same hex → same oklch), so re-parsing the same fingerprint always
  // yields the same in-memory shape. Without this, `comparePalette`
  // misreads hex-only colors as fully unmatched (distance 1) and even
  // self-distance comes out non-zero.
  backfillPaletteOklch(parsed.fingerprint);

  if (!options.noEmbeddingBackfill) {
    parsed.fingerprint.embedding = resolveEmbedding(parsed.fingerprint);
  }

  return parsed;
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
  // Only recompute when the structured blocks are all present.
  // Partial fingerprints (e.g. an extends overlay loaded with noExtends:true)
  // don't have enough signal yet — leave the embedding empty and let the
  // caller resolve it after composing.
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
  // The merged result must satisfy the strict YAML schema. The in-memory
  // fingerprint may carry body-owned prose (summary, decision rationale,
  // values) that the schema forbids — strip it via mergeFrontmatter before
  // validating.
  validateFrontmatter(mergeFrontmatter(merged));

  // Meta merge: overlay wins on everything except extends (dropped after resolve)
  const { extends: _dropped, ...overlayMeta } = overlay.meta;
  return {
    fingerprint: merged,
    meta: { ...base.meta, ...overlayMeta },
    body: overlay.body,
    bodyRaw: overlay.bodyRaw,
  };
}
