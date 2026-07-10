// The bench loop: one ask, N single-shot selection trials, scored.
// Selection is the unit. No generation, ever — the moment this generates,
// it is rebuilding steering-control.
import { consistency, precisionRecall, selectionRates } from "./score.mjs";

/**
 * Run one ask against the menu for `trials` independent single-shot calls.
 * Returns raw trial selections plus deterministic scores.
 */
export async function runAsk({ model, ask, menu, trials = 5, expected }) {
  const known = new Set(menu.map((entry) => entry.id));
  // Trials are independent single-shot calls by design, so fire them
  // concurrently; real endpoints are latency-bound, not rate-bound here.
  const selections = await Promise.all(
    Array.from({ length: trials }, async (_, trial) => {
      const ids = await model.select({ ask, menu, trial });
      // Keep only ids that exist on the menu: a real model can hallucinate
      // ids, and that miss is worth surfacing separately from selection.
      return {
        ids: ids.filter((id) => known.has(id)),
        hallucinated: ids.filter((id) => !known.has(id)),
      };
    }),
  );
  const trialIds = selections.map((s) => s.ids);
  return {
    ask,
    model: model.name,
    trials: trialIds,
    hallucinated: selections.flatMap((s) => s.hallucinated),
    expected: expected ?? null,
    scores: {
      consistency: consistency(trialIds),
      ...(expected ? { ...precisionRecall(trialIds, expected) } : {}),
    },
    rates: selectionRates(trialIds, menu),
  };
}

/**
 * Parse an asks.md file: numbered asks, each optionally followed by an
 * `expect:` line of comma/space separated node ids. Same numbered-family
 * format as steering-control's asks file.
 *
 *   1. A dense settings screen for notification preferences
 *      expect: grammar.hierarchy, register.data-density
 */
export function parseAsks(markdown) {
  const asks = [];
  let current = null;
  for (const line of markdown.split("\n")) {
    const askMatch = line.match(/^(\d+)\.\s+(.*\S)\s*$/);
    if (askMatch) {
      current = { n: Number(askMatch[1]), ask: askMatch[2], expected: null };
      asks.push(current);
      continue;
    }
    const expectMatch = line.match(/^\s+expect:\s*(.*\S)\s*$/);
    if (expectMatch && current) {
      current.expected = expectMatch[1]
        .split(/[,\s]+/)
        .filter((id) => id.length > 0);
    }
  }
  return asks;
}
