// Deterministic scoring over collected selections. No LLM judges here.

/** Jaccard similarity of two id arrays. Empty ∩ empty = 1 (perfectly consistent). */
export function jaccard(a, b) {
  const setA = new Set(a);
  const setB = new Set(b);
  if (setA.size === 0 && setB.size === 0) return 1;
  let inter = 0;
  for (const id of setA) if (setB.has(id)) inter += 1;
  const union = setA.size + setB.size - inter;
  return union === 0 ? 1 : inter / union;
}

/** Mean pairwise Jaccard across all trials of one ask. 1 = identical every run. */
export function consistency(trials) {
  if (trials.length < 2) return 1;
  let sum = 0;
  let pairs = 0;
  for (let i = 0; i < trials.length; i += 1) {
    for (let j = i + 1; j < trials.length; j += 1) {
      sum += jaccard(trials[i], trials[j]);
      pairs += 1;
    }
  }
  return sum / pairs;
}

/** Precision/recall of the union of trial selections vs an expected id set. */
export function precisionRecall(trials, expected) {
  if (!expected || expected.length === 0) return null;
  const union = new Set(trials.flat());
  const want = new Set(expected);
  let hit = 0;
  for (const id of union) if (want.has(id)) hit += 1;
  return {
    precision: union.size === 0 ? 0 : hit / union.size,
    recall: hit / want.size,
  };
}

/**
 * Per-node selection rate for one ask: fraction of trials that picked it.
 * This is the heatmap's cell value. 1 = solid column, ~0.5 = coin-flip.
 */
export function selectionRates(trials, menu) {
  const counts = new Map(menu.map((entry) => [entry.id, 0]));
  for (const trial of trials) {
    for (const id of new Set(trial)) {
      if (counts.has(id)) counts.set(id, counts.get(id) + 1);
    }
  }
  const n = Math.max(trials.length, 1);
  return Object.fromEntries([...counts].map(([id, count]) => [id, count / n]));
}

/** Suite-level rollup: dead nodes across all asks. */
export function suiteCoverage(results, menu) {
  const everSelected = new Set();
  for (const result of results) {
    for (const trial of result.trials) {
      for (const id of trial) everSelected.add(id);
    }
  }
  const dead = menu
    .map((entry) => entry.id)
    .filter((id) => !everSelected.has(id));
  return {
    nodes: menu.length,
    selectedEver: everSelected.size,
    dead,
  };
}
