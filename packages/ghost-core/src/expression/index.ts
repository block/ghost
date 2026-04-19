import { readFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import type { DesignDecision, DesignFingerprint } from "../types.js";
import { mergeExpression } from "./compose.js";
import { loadDecisionFragments } from "./fragments.js";
import { type ParsedExpression, parseExpression } from "./parser.js";
import { validateFrontmatter } from "./schema.js";

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
export { loadDecisionFragments } from "./fragments.js";
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
/** Legacy filename retained for back-compat during the transition. */
export const LEGACY_FINGERPRINT_FILENAME = ".ghost-fingerprint.json";

export interface LoadOptions {
  /** Skip `extends:` resolution. Default: false (extends chains are resolved). */
  noExtends?: boolean;
  /** Skip `decisions/` fragment auto-assembly. Default: false. */
  noFragments?: boolean;
}

/**
 * Load a ParsedExpression from disk, dispatching on file extension.
 * - `.md` → parsed as an expression (frontmatter + meta + body)
 * - anything else → parsed as legacy JSON (meta and body empty)
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
  const parsed = options.noExtends
    ? await loadRaw(path)
    : await loadWithExtends(path, new Set());

  if (!options.noFragments && path.endsWith(".md")) {
    const absolute = isAbsolute(path) ? path : resolve(path);
    const fragments = await loadDecisionFragments(dirname(absolute));
    if (fragments.length) {
      parsed.fingerprint.decisions = mergeDecisionsByDimension(
        parsed.fingerprint.decisions ?? [],
        fragments,
      );
    }
  }

  return parsed;
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
  const raw = await readFile(path, "utf-8");
  if (path.endsWith(".md")) {
    return parseExpression(raw);
  }
  const fingerprint = JSON.parse(raw) as DesignFingerprint;
  return { fingerprint, meta: {}, body: {} };
}

async function loadWithExtends(
  path: string,
  visited: Set<string>,
): Promise<ParsedExpression> {
  const absolute = isAbsolute(path) ? path : resolve(path);
  if (visited.has(absolute)) {
    throw new Error(
      `Cycle detected while resolving extends: chain — ${absolute} visited twice.`,
    );
  }
  visited.add(absolute);

  const raw = await readFile(absolute, "utf-8");
  if (!absolute.endsWith(".md")) {
    const fingerprint = JSON.parse(raw) as DesignFingerprint;
    return { fingerprint, meta: {}, body: {} };
  }

  const child = parseExpression(raw);
  if (!child.meta.extends) {
    return child;
  }

  const parentPath = resolve(dirname(absolute), child.meta.extends);
  const parent = await loadWithExtends(parentPath, visited);

  const merged = mergeExpression(parent.fingerprint, child.fingerprint);
  // The merged result must satisfy the strict schema — if the chain
  // doesn't fill in everything required, fail loudly here.
  validateFrontmatter(toValidatable(merged));

  // Meta merge: child wins on everything except extends (dropped after resolve)
  const { extends: _dropped, ...childMeta } = child.meta;
  return {
    fingerprint: merged,
    meta: { ...parent.meta, ...childMeta },
    body: child.body,
  };
}

/**
 * Convert a DesignFingerprint back into the shape zod expects for
 * validation. The two shapes are isomorphic; this cast is just to satisfy
 * the partial/strict schema variance.
 */
function toValidatable(fp: DesignFingerprint): Record<string, unknown> {
  return fp as unknown as Record<string, unknown>;
}
