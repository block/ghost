// The bench loop: one ask, N single-shot selection trials, scored.
// Selection is the unit. No generation, ever.
import { consistency, precisionRecall, selectionRates } from "./score.mjs";

/** Run one ask against the gather output for independent selection trials. */
export async function runAsk({
  model,
  ask,
  menu,
  cover,
  trials = 5,
  expected,
  poison,
}) {
  const known = new Set(menu.map((entry) => entry.id));
  const selections = await Promise.all(
    Array.from({ length: trials }, async (_, trial) => {
      const ids = await model.select({ ask, menu, cover, trial });
      return {
        ids: ids.filter((id) => known.has(id)),
        unknownIds: ids.filter((id) => !known.has(id)),
      };
    }),
  );
  const trialIds = selections.map((selection) => selection.ids);
  return {
    ask,
    model: model.name,
    trials: trialIds,
    unknownIds: selections.flatMap((selection) => selection.unknownIds),
    expected: expected ?? null,
    poison: poison ?? [],
    scores: {
      consistency: consistency(trialIds),
      ...(expected ? precisionRecall(trialIds, expected, poison ?? []) : {}),
    },
    rates: selectionRates(trialIds, menu),
  };
}

/**
 * Parse the asks format shared with steering-control:
 *
 *   ## Ask 1 — billing settings page
 *
 *   Build a billing settings page. Single HTML file.
 *
 *   expect: foundation.composition, foundation.controls
 *   poison: context.conversation
 */
export function parseAsks(markdown, { validateIds } = {}) {
  const asks = [];
  let current = null;

  const flush = () => {
    if (!current) return;
    current.ask = current.bodyLines.join("\n").trim();
    delete current.bodyLines;
    asks.push(current);
  };

  for (const line of markdown.split(/\r?\n/)) {
    const heading = line.match(/^##\s+Ask\s+(\d+)\s+[—-]\s+(.+)\s*$/u);
    if (heading) {
      flush();
      current = {
        n: Number(heading[1]),
        title: heading[2].trim(),
        ask: "",
        bodyLines: [],
        expected: [],
        poison: [],
        discount: [],
      };
      continue;
    }
    if (!current) continue;

    const meta = line.match(/^\s*(expect|poison|discount):\s*(.*?)\s*$/u);
    if (meta) {
      const key = meta[1] === "expect" ? "expected" : meta[1];
      current[key] = splitIds(meta[2]);
      continue;
    }
    current.bodyLines.push(line);
  }

  flush();
  if (validateIds) {
    for (const ask of asks) {
      for (const id of [...ask.expected, ...ask.poison]) {
        if (!validateIds.has(id)) {
          throw new Error(`ask ${ask.n} references unknown node id: ${id}`);
        }
      }
    }
  }
  return asks;
}

function splitIds(value) {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}
