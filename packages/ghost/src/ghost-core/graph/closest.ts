/**
 * Closest-id suggestions for an unknown node/surface name. When an agent names
 * a node that is not in the package, the surface-naming commands
 * (`gather`/`checks`/`review`) emit a "did you mean" hint rather than silently
 * routing to nothing. This is that hint: deterministic, LLM-free, bounded.
 *
 * It is not a search engine. An inexact `gather <query>` shows the node menu
 * and lets the agent re-pick by description; this only nominates the few ids a
 * typo most likely meant.
 */

/**
 * Suggest the ids closest to `query`, nearest first. Substring matches always
 * rank above pure edit-distance neighbours.
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
