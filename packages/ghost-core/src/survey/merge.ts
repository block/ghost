import type {
  ComponentRow,
  RowBase,
  Survey,
  SurveySource,
  TokenRow,
  ValueRow,
} from "./types.js";

/**
 * Merge N surveys into one. Concat semantics with id-based dedup.
 *
 * Two scans of the same `(target, commit)` produce rows with identical
 * IDs by construction — those rows are deduplicated to one (first wins).
 * Two scans of different commits or different targets produce distinct
 * IDs, so all observations survive.
 *
 * `sources` becomes the union of input sources, also deduped on
 * `(id, role, target, commit)` so source-graph roles survive merges.
 *
 * Idempotent: `mergeSurveys(b)` == `b`. Commutative on the rowset (order
 * within sections may differ from input order but content is identical).
 */
export function mergeSurveys(...surveys: Survey[]): Survey {
  if (surveys.length === 0) {
    throw new Error("mergeSurveys requires at least one input survey");
  }
  return {
    schema: "ghost.survey/v1",
    sources: dedupSources(surveys.flatMap((b) => b.sources)),
    values: dedupRows(surveys.flatMap((b) => b.values)),
    tokens: dedupRows(surveys.flatMap((b) => b.tokens)),
    components: dedupRows(surveys.flatMap((b) => b.components)),
  };
}

function dedupRows<T extends RowBase>(rows: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of rows) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row);
  }
  return out;
}

function dedupSources(sources: SurveySource[]): SurveySource[] {
  const seen = new Set<string>();
  const out: SurveySource[] = [];
  for (const source of sources) {
    const key = [
      source.id ?? "",
      source.role ?? "",
      source.target,
      source.commit ?? "",
    ].join("\x00");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(source);
  }
  return out;
}

// Type re-exports kept narrow so consumers don't have to import from `types.js`
// just to use `mergeSurveys` results.
export type { ComponentRow, Survey, SurveySource, TokenRow, ValueRow };
