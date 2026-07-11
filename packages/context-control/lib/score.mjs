// Deterministic scoring over collected selections. No LLM judges here.

/** Jaccard similarity of two id arrays. Empty ∩ empty = 1. */
export function jaccard(a, b) {
  const setA = new Set(a);
  const setB = new Set(b);
  if (setA.size === 0 && setB.size === 0) return 1;
  let intersection = 0;
  for (const id of setA) if (setB.has(id)) intersection += 1;
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 1 : intersection / union;
}

/** Mean pairwise Jaccard across all trials of one ask. */
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

/** Mean per-trial precision, recall, and poison-selection rate. */
export function precisionRecall(trials, expected, poison = []) {
  if (!expected || expected.length === 0) return {};
  const want = new Set(expected);
  const avoid = new Set(poison);
  if (trials.length === 0) return {};
  const perTrial = trials.map((trial) => {
    const selected = new Set(trial);
    let hits = 0;
    for (const id of selected) if (want.has(id)) hits += 1;
    return {
      precision: selected.size === 0 ? 0 : hits / selected.size,
      recall: hits / want.size,
      poisonSelected: [...avoid].some((id) => selected.has(id)),
    };
  });
  return {
    precision: mean(perTrial.map((trial) => trial.precision)),
    recall: mean(perTrial.map((trial) => trial.recall)),
    ...(avoid.size > 0
      ? {
          poisonRate:
            perTrial.filter((trial) => trial.poisonSelected).length /
            perTrial.length,
        }
      : {}),
  };
}

/** Per-node selection rate for one ask. */
export function selectionRates(trials, menu) {
  const counts = new Map(menu.map((entry) => [entry.id, 0]));
  for (const trial of trials) {
    for (const id of new Set(trial)) {
      if (counts.has(id)) counts.set(id, counts.get(id) + 1);
    }
  }
  const count = Math.max(trials.length, 1);
  return Object.fromEntries(
    [...counts].map(([id, selected]) => [id, selected / count]),
  );
}

/** Suite-level rollup: nodes never selected across all asks. */
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

function mean(values) {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
}
