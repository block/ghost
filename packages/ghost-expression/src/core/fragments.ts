import { readdir, readFile, stat } from "node:fs/promises";
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  join,
  resolve,
} from "node:path";
import type { DesignDecision } from "@ghost/core";
import { parse as parseYaml } from "yaml";
import { splitRaw } from "./parser.js";

/**
 * If a `decisions/` directory exists next to the expression.md, each
 * .md file inside is read as a single DesignDecision:
 *
 *   ---
 *   dimension: warm-neutrals          # optional — falls back to filename
 *   evidence: ["#111", "#4d4c48"]     # optional — empty array if missing
 *   ---
 *   No cool blue-grays anywhere. Every gray carries a warm undertone.
 *
 * The file's markdown body becomes the decision's prose. The assembled
 * decisions are then merged into the main expression's `decisions` via
 * the same by-dimension rules as extends composition.
 */
export async function loadDecisionFragments(
  expressionDir: string,
): Promise<DesignDecision[]> {
  const fragDir = join(expressionDir, "decisions");
  let stats: Awaited<ReturnType<typeof stat>>;
  try {
    stats = await stat(fragDir);
  } catch {
    return [];
  }
  if (!stats.isDirectory()) return [];

  const entries = await readdir(fragDir);
  const mdFiles = entries.filter((e) => e.endsWith(".md"));
  const decisions: DesignDecision[] = [];

  for (const name of mdFiles) {
    const path = join(fragDir, name);
    const raw = await readFile(path, "utf-8");
    const decision = parseFragment(raw, basename(name, extname(name)));
    if (decision) decisions.push(decision);
  }

  return decisions;
}

function parseFragment(
  raw: string,
  filenameSlug: string,
): DesignDecision | null {
  let yamlObj: Record<string, unknown> = {};
  let prose = raw;

  try {
    const { frontmatter, body } = splitRaw(raw);
    yamlObj = (parseYaml(frontmatter) ?? {}) as Record<string, unknown>;
    prose = body;
  } catch {
    // No frontmatter — treat the whole file as prose with filename as dimension.
  }

  const dimension =
    typeof yamlObj.dimension === "string" ? yamlObj.dimension : filenameSlug;
  const dimensionKind =
    typeof yamlObj.dimension_kind === "string"
      ? yamlObj.dimension_kind
      : undefined;
  const evidence = Array.isArray(yamlObj.evidence)
    ? yamlObj.evidence.filter((e): e is string => typeof e === "string")
    : [];

  const decisionText = prose.trim();
  if (!dimension || !decisionText) return null;

  return {
    dimension,
    decision: decisionText,
    evidence,
    ...(dimensionKind ? { dimension_kind: dimensionKind } : {}),
  };
}

/**
 * Canonical filename for the embedding fragment sibling of expression.md.
 * Holds the 49-dim vector as YAML so the root expression.md stays lean.
 */
export const EMBEDDING_FRAGMENT_FILENAME = "embedding.md";

/**
 * Serialize an embedding vector to a fragment file. The file carries only
 * a `vector:` array — no prose body. `of:` ties it back to the expression
 * expression id so the link isn't ambiguous.
 */
export function serializeEmbeddingFragment(
  embedding: number[],
  expressionId: string,
): string {
  const lines: string[] = ["---"];
  lines.push("kind: embedding");
  lines.push(`of: ${expressionId}`);
  lines.push(`dimensions: ${embedding.length}`);
  lines.push("vector:");
  for (const v of embedding) {
    lines.push(`  - ${v}`);
  }
  lines.push("---");
  return `${lines.join("\n")}\n`;
}

/**
 * Parse an embedding.md fragment and return the vector. Returns null if
 * the file doesn't exist, doesn't carry a `vector:` array, or the array
 * isn't all numbers.
 */
export async function loadEmbeddingFragment(
  expressionDir: string,
  referencedPath?: string,
): Promise<number[] | null> {
  const candidate = referencedPath
    ? isAbsolute(referencedPath)
      ? referencedPath
      : resolve(expressionDir, referencedPath)
    : join(expressionDir, EMBEDDING_FRAGMENT_FILENAME);

  let raw: string;
  try {
    raw = await readFile(candidate, "utf-8");
  } catch {
    return null;
  }

  let yamlObj: Record<string, unknown>;
  try {
    const { frontmatter } = splitRaw(raw);
    yamlObj = (parseYaml(frontmatter) ?? {}) as Record<string, unknown>;
  } catch {
    return null;
  }

  const vec = yamlObj.vector;
  if (!Array.isArray(vec)) return null;
  if (!vec.every((v) => typeof v === "number")) return null;
  return vec as number[];
}

/**
 * Scan an expression body for markdown fragment links `[label](path)`.
 * Returns relative paths (no resolution). Used to progressively discover
 * which fragment files the author has chosen to attach — mirrors the
 * agent-skills pattern of references-as-body-links.
 *
 * Only `.md` targets are treated as fragments. Absolute URLs (http://…)
 * and anchors (#foo) are ignored.
 */
export function findFragmentLinks(body: string): string[] {
  const out: string[] = [];
  const re = /\[([^\]]+)\]\(([^)]+)\)/g;
  for (const m of body.matchAll(re)) {
    const target = m[2].trim();
    if (!target.endsWith(".md")) continue;
    if (/^[a-z]+:\/\//i.test(target)) continue;
    if (target.startsWith("#")) continue;
    out.push(target);
  }
  return out;
}

/**
 * Resolve the embedding fragment path from a body — prefers an explicit
 * body link named `embedding.md` (or ending in `/embedding.md`), falls
 * back to the conventional sibling filename. Used by the loader to decide
 * where to read the vector from.
 */
export function resolveEmbeddingReference(
  body: string,
  expressionDir: string,
): string | null {
  const links = findFragmentLinks(body);
  const match = links.find(
    (p) =>
      p.endsWith(`/${EMBEDDING_FRAGMENT_FILENAME}`) ||
      p === EMBEDDING_FRAGMENT_FILENAME,
  );
  if (match) {
    return isAbsolute(match) ? match : resolve(expressionDir, match);
  }
  // No body link — conventional sibling.
  return join(expressionDir, EMBEDDING_FRAGMENT_FILENAME);
}

/** Directory-relative utility for writers that emit a fragment next to a target file. */
export function embeddingSiblingPath(expressionPath: string): string {
  return join(dirname(expressionPath), EMBEDDING_FRAGMENT_FILENAME);
}
