import { readFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import { computeEmbedding } from "../embedding/embedding.js";
import type { DesignDecision, Expression } from "../types.js";
import { mergeExpression } from "./compose.js";
import {
  loadDecisionFragments,
  loadEmbeddingFragment,
  resolveEmbeddingReference,
} from "./fragments.js";
import { mergeFrontmatter } from "./frontmatter.js";
import { type ParsedExpression, parseExpression } from "./parser.js";
import { validateFrontmatter } from "./schema.js";

function assertMarkdownPath(path: string): void {
  if (!path.endsWith(".md")) {
    throw new Error(
      `Expression files must be Markdown (.md). Got: ${path}. The legacy .ghost-fingerprint.json format has been removed — regenerate with \`ghost profile . --emit\`.`,
    );
  }
}

export type { BodyData } from "./body.js";
export { parseBody } from "./body.js";
export type { DesignDecision } from "./compose.js";
export { mergeExpression } from "./compose.js";
export type {
  ColorChange,
  DecisionChange,
  SemanticDiff,
  TokenChange,
} from "./diff.js";
export { compareExpressions, formatSemanticDiff } from "./diff.js";
export {
  EMBEDDING_FRAGMENT_FILENAME,
  embeddingSiblingPath,
  findFragmentLinks,
  loadDecisionFragments,
  loadEmbeddingFragment,
  resolveEmbeddingReference,
  serializeEmbeddingFragment,
} from "./fragments.js";
export type { ExpressionMeta, FrontmatterData } from "./frontmatter.js";
export type {
  LintIssue,
  LintOptions,
  LintReport,
  LintSeverity,
} from "./lint.js";
export { lintExpression } from "./lint.js";
export type { ParsedExpression, ParseOptions } from "./parser.js";
export { parseExpression, splitRaw } from "./parser.js";
export type { FrontmatterShape } from "./schema.js";
export {
  EXPRESSION_SCHEMA_VERSION,
  FrontmatterSchema,
  toJsonSchema,
  validateFrontmatter,
} from "./schema.js";
export type { SerializeOptions } from "./writer.js";
export { serializeExpression } from "./writer.js";

/** Canonical filename for the emitted expression. */
export const EXPRESSION_FILENAME = "expression.md";

export interface LoadOptions {
  /** Skip `extends:` resolution. Default: false (extends chains are resolved). */
  noExtends?: boolean;
  /** Skip `decisions/` fragment auto-assembly. Default: false. */
  noFragments?: boolean;
  /**
   * Skip embedding backfill. When true, a missing `embedding` stays empty;
   * useful for read-only tooling (lint, diff-on-disk) that doesn't need
   * the vector.
   */
  noEmbeddingBackfill?: boolean;
}

/**
 * Load a ParsedExpression from disk.
 *
 * If the file declares `extends:`, the parent is loaded recursively and
 * merged per the rules in compose.ts: child wins, decisions merged by
 * dimension, palette roles merged by role.
 *
 * If a `decisions/` directory sits next to the expression.md, each .md
 * inside is assembled into the fingerprint's decisions[], merged by
 * dimension — allowing large systems to split their rules across files.
 */
export async function loadExpression(
  path: string,
  options: LoadOptions = {},
): Promise<ParsedExpression> {
  assertMarkdownPath(path);

  const parsed = options.noExtends
    ? await loadRaw(path)
    : await loadWithExtends(path, new Set());

  const absolute = isAbsolute(path) ? path : resolve(path);
  const expressionDir = dirname(absolute);

  if (!options.noFragments) {
    const fragments = await loadDecisionFragments(expressionDir);
    if (fragments.length) {
      parsed.fingerprint.decisions = mergeDecisionsByDimension(
        parsed.fingerprint.decisions ?? [],
        fragments,
      );
    }
  }

  if (!options.noEmbeddingBackfill) {
    parsed.fingerprint.embedding = await resolveEmbedding(
      parsed.fingerprint,
      expressionDir,
      parsed.bodyRaw,
    );
  }

  return parsed;
}

/**
 * Resolve the embedding for an expression.md in order:
 *   1. Inline `embedding:` in frontmatter (trust as cache).
 *   2. Explicit body link to `embedding.md` (fragment file).
 *   3. Conventional sibling `embedding.md` next to expression.md.
 *   4. Recompute from the structured blocks.
 *
 * This matches the agent-skills progressive-disclosure model — the thin
 * index file references a sibling, but the sibling is optional and can
 * be rebuilt any time from source-of-truth data.
 */
async function resolveEmbedding(
  fingerprint: Expression,
  expressionDir: string,
  bodyRaw: string | undefined,
): Promise<number[]> {
  if (fingerprint.embedding && fingerprint.embedding.length > 0) {
    return fingerprint.embedding;
  }
  const referenced = bodyRaw
    ? resolveEmbeddingReference(bodyRaw, expressionDir)
    : null;
  if (referenced) {
    const fromFragment = await loadEmbeddingFragment(expressionDir, referenced);
    if (fromFragment) return fromFragment;
  }
  // Only attempt to recompute when the structured blocks are all present.
  // Partial fingerprints (e.g. an extends-child loaded with noExtends:true)
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

function mergeDecisionsByDimension(
  base: DesignDecision[],
  overlay: DesignDecision[],
): DesignDecision[] {
  const overlayMap = new Map(overlay.map((d) => [d.dimension, d]));
  const out: DesignDecision[] = [];
  const seen = new Set<string>();
  for (const d of base) {
    seen.add(d.dimension);
    out.push(overlayMap.get(d.dimension) ?? d);
  }
  for (const d of overlay) {
    if (!seen.has(d.dimension)) out.push(d);
  }
  return out;
}

async function loadRaw(path: string): Promise<ParsedExpression> {
  assertMarkdownPath(path);
  const raw = await readFile(path, "utf-8");
  return parseExpression(raw);
}

async function loadWithExtends(
  path: string,
  visited: Set<string>,
): Promise<ParsedExpression> {
  assertMarkdownPath(path);
  const absolute = isAbsolute(path) ? path : resolve(path);
  if (visited.has(absolute)) {
    throw new Error(
      `Cycle detected while resolving extends: chain — ${absolute} visited twice.`,
    );
  }
  visited.add(absolute);

  const raw = await readFile(absolute, "utf-8");
  const child = parseExpression(raw);
  if (!child.meta.extends) {
    return child;
  }

  const parentPath = resolve(dirname(absolute), child.meta.extends);
  const parent = await loadWithExtends(parentPath, visited);

  const merged = mergeExpression(parent.fingerprint, child.fingerprint);
  // The merged result must satisfy the strict YAML schema. The in-memory
  // fingerprint may carry body-owned prose (summary, decision rationale,
  // values) that the schema forbids — strip it via mergeFrontmatter before
  // validating.
  validateFrontmatter(mergeFrontmatter(merged));

  // Meta merge: child wins on everything except extends (dropped after resolve)
  const { extends: _dropped, ...childMeta } = child.meta;
  return {
    fingerprint: merged,
    meta: { ...parent.meta, ...childMeta },
    body: child.body,
    bodyRaw: child.bodyRaw,
  };
}
