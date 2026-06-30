import { GHOST_GRAPH_ROOT_ID, type GhostGraph } from "./types.js";

/**
 * Node ranking for `gather`. Where `gather` with no argument lists the full
 * node menu sorted by id, and `gather <exact-id>` composes a slice, an inexact
 * query (`gather payment`) needs the *closest* nodes surfaced, not the whole
 * menu dumped. This is that ranking: deterministic and LLM-free, ordered by
 * match tier — a name match outranks a description match outranks an incidental
 * body mention, a whole-name typo is tolerated, and a multi-word phrase matches
 * when all of its words land on a node. Selection machinery, not
 * interpretation: the agent reads the short candidate list and re-picks by
 * description, so the tiers exist for recall, not calibrated ordering.
 */

/**
 * Why a hit matched, strongest first. Doubles as the ranking tier and — for the
 * `name`/`description`/`body` tiers — names the field the signal landed in, so
 * a route can explain itself.
 */
export type SearchReason =
  | "exact"
  | "name"
  | "description"
  | "body"
  | "tokens"
  | "fuzzy";

export interface SearchHit {
  id: string;
  description?: string;
  /** True when the node is a directory/surface (vs. a leaf node). */
  surface: boolean;
  /** The match tier; also fixes the order (stronger tiers first). */
  reason: SearchReason;
}

/** Tier order, strongest first. Lower index ranks higher. */
const TIER_ORDER: SearchReason[] = [
  "exact",
  "name",
  "description",
  "body",
  "tokens",
  "fuzzy",
];

const DEFAULT_LIMIT = 20;

/**
 * Rank a package's local nodes against `query`, nearest first. A node with
 * children (or whose index sits in its own folder) is flagged as a surface.
 * Inherited (extended-package) nodes are excluded, mirroring `buildGraphMenu` —
 * ranking lists what this package offers to anchor at.
 */
export function searchGraph(
  query: string,
  graph: GhostGraph,
  opts: { limit?: number } = {},
): SearchHit[] {
  const needle = query.trim().toLowerCase();
  const limit = opts.limit ?? DEFAULT_LIMIT;
  const hits: SearchHit[] = [];

  if (needle.length === 0) return [];
  const tokens = tokenize(needle);

  for (const node of graph.nodes.values()) {
    if (node.origin === "inherited") continue;
    if (node.id === GHOST_GRAPH_ROOT_ID) continue;
    // A surface is a directory: its index node sits in its own folder
    // (`folder === id`), or it has children placed under it. A leaf's folder is
    // its parent directory, so it never matches.
    const surface =
      node.folder === node.id || (graph.children.get(node.id)?.length ?? 0) > 0;

    const reason = matchTier(
      needle,
      tokens,
      node.id,
      node.description,
      node.body,
    );
    if (!reason) continue;
    hits.push({
      id: node.id,
      ...(node.description ? { description: node.description } : {}),
      surface,
      reason,
    });
  }

  hits.sort(
    (a, b) =>
      TIER_ORDER.indexOf(a.reason) - TIER_ORDER.indexOf(b.reason) ||
      a.id.localeCompare(b.id),
  );
  return hits.slice(0, Math.max(0, limit));
}

/**
 * Split a query into meaningful tokens: lowercase words of length >= 2. An
 * agent's natural query ("payment confirmation screen") is a phrase, not a node
 * id, so the token tier matches its words independently rather than as one
 * verbatim string.
 */
function tokenize(needle: string): string[] {
  return needle
    .split(/[^a-z0-9]+/i)
    .map((token) => token.toLowerCase())
    .filter((token) => token.length >= 2);
}

/**
 * The match tier for a candidate, strongest first, or undefined when nothing
 * matches:
 *
 * 1. Whole-query matches (verbatim, in name/description/body): an exact id,
 *    then a name/description/body substring.
 * 2. A whole-name typo gets the fuzzy tier (e.g. `markting` → `marketing`).
 * 3. Otherwise, a multi-word query where every token lands somewhere on the
 *    node (the agent typed a phrase, not an id).
 */
function matchTier(
  needle: string,
  tokens: string[],
  name: string,
  description: string | undefined,
  body: string,
): SearchReason | undefined {
  const lowerName = name.toLowerCase();
  const lowerDesc = description?.toLowerCase();
  const lowerBody = body.toLowerCase();

  // 1. Whole-query matches: precise, highest-ranked.
  if (lowerName === needle) return "exact";
  if (lowerName.includes(needle)) return "name";
  if (lowerDesc?.includes(needle)) return "description";
  if (lowerBody.includes(needle)) return "body";

  // 2. Whole-name typo fallback.
  const segment = lowerName.split("/").pop() ?? lowerName;
  if (isFuzzyMatch(needle, segment) || isFuzzyMatch(needle, lowerName)) {
    return "fuzzy";
  }

  // 3. Multi-word token coverage. Only meaningful for multi-token queries; a
  // single token already had its verbatim shot above. Every token must land.
  if (tokens.length < 2) return undefined;
  const allCovered = tokens.every(
    (token) =>
      lowerName.includes(token) ||
      lowerDesc?.includes(token) ||
      lowerBody.includes(token),
  );
  return allCovered ? "tokens" : undefined;
}

/**
 * Suggest the ids closest to `query`, nearest first. Used for "did you mean"
 * surface suggestions on an unknown name. Substring matches always rank above
 * pure edit-distance neighbours.
 */
export function closestIds(
  query: string,
  ids: Iterable<string>,
  max = 3,
): string[] {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return [];

  const scored: { id: string; rank: number; distance: number }[] = [];
  for (const id of ids) {
    const lower = id.toLowerCase();
    const segment = lower.split("/").pop() ?? lower;
    const distance = Math.min(
      levenshtein(needle, lower),
      levenshtein(needle, segment),
    );
    const substring = lower.includes(needle) || needle.includes(lower);
    if (substring) {
      scored.push({ id, rank: 0, distance });
    } else if (distance <= fuzzyThreshold(needle)) {
      scored.push({ id, rank: 1, distance });
    }
  }

  scored.sort(
    (a, b) =>
      a.rank - b.rank || a.distance - b.distance || a.id.localeCompare(b.id),
  );
  return scored.slice(0, Math.max(0, max)).map((entry) => entry.id);
}

/** A length-proportional edit-distance threshold for typo tolerance. */
function fuzzyThreshold(needle: string): number {
  if (needle.length <= 4) return 1;
  if (needle.length <= 8) return 2;
  return 3;
}

function isFuzzyMatch(needle: string, candidate: string): boolean {
  return levenshtein(needle, candidate) <= fuzzyThreshold(needle);
}

/** Classic iterative Levenshtein distance. Dependency-free, O(n*m). */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        (prev[j] ?? 0) + 1,
        (curr[j - 1] ?? 0) + 1,
        (prev[j - 1] ?? 0) + cost,
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length] ?? 0;
}
