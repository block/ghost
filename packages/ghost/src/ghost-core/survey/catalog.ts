import { RECOMMENDED_VALUE_KINDS } from "./schema.js";

export { formatSurveyCatalogMarkdown } from "./catalog-format.js";

import type {
  SurveyCatalogKind,
  SurveyCatalogOptions,
  SurveyCatalogValue,
  SurveyValueCatalog,
} from "./catalog-types.js";

export type {
  SurveyCatalogCounts,
  SurveyCatalogKind,
  SurveyCatalogOptions,
  SurveyCatalogValue,
  SurveyValueCatalog,
} from "./catalog-types.js";

import type { Survey, SurveySource, ValueRow, ValueSpec } from "./types.js";

interface MutableCatalogValue {
  value: string;
  rows: number;
  occurrences: number;
  files_count: number;
  ids: Set<string>;
  raws: Set<string>;
  usage: Map<string, number>;
  role_hypotheses: Set<string>;
  specs: Map<string, ValueSpec>;
  sources: Set<string>;
  resolution_statuses: Set<string>;
}

export function catalogSurveyValues(
  survey: Survey,
  options: SurveyCatalogOptions = {},
): SurveyValueCatalog {
  const rows = options.kind
    ? survey.values.filter((row) => row.kind === options.kind)
    : survey.values;
  const kinds = orderedKinds(rows).map((kind) =>
    catalogKind(
      kind,
      rows.filter((row) => row.kind === kind),
    ),
  );
  const values = kinds.flatMap((kind) => kind.values);

  return {
    schema: "ghost.survey.catalog/v1",
    source_schema: survey.schema,
    ...(options.kind ? { filter: { kind: options.kind } } : {}),
    counts: {
      kinds: kinds.length,
      values: values.length,
      rows: rows.length,
      total_occurrences: sum(rows.map((row) => row.occurrences)),
    },
    kinds,
  };
}

function catalogKind(kind: string, rows: ValueRow[]): SurveyCatalogKind {
  const grouped = new Map<string, MutableCatalogValue>();
  for (const row of rows) {
    const current = grouped.get(row.value) ?? createValue(row.value);
    current.rows += 1;
    current.occurrences += row.occurrences;
    current.files_count += row.files_count;
    current.ids.add(row.id);
    if (row.raw) current.raws.add(row.raw);
    if (row.role_hypothesis) current.role_hypotheses.add(row.role_hypothesis);
    if (row.spec) current.specs.set(stableJson(row.spec), row.spec);
    current.sources.add(sourceLabel(row.source));
    if (row.resolution?.status) {
      current.resolution_statuses.add(row.resolution.status);
    }
    for (const [usage, count] of Object.entries(row.usage ?? {})) {
      current.usage.set(usage, (current.usage.get(usage) ?? 0) + count);
    }
    grouped.set(row.value, current);
  }

  const values = [...grouped.values()].map(finalizeValue).sort(sortValues);
  return {
    kind,
    values,
    rows: rows.length,
    occurrences: sum(rows.map((row) => row.occurrences)),
    files_count: sum(rows.map((row) => row.files_count)),
  };
}

function createValue(value: string): MutableCatalogValue {
  return {
    value,
    rows: 0,
    occurrences: 0,
    files_count: 0,
    ids: new Set(),
    raws: new Set(),
    usage: new Map(),
    role_hypotheses: new Set(),
    specs: new Map(),
    sources: new Set(),
    resolution_statuses: new Set(),
  };
}

function finalizeValue(value: MutableCatalogValue): SurveyCatalogValue {
  return pruneUndefined({
    value: value.value,
    rows: value.rows,
    occurrences: value.occurrences,
    files_count: value.files_count,
    ids: [...value.ids].sort(compareStrings),
    raws: [...value.raws].sort(compareStrings),
    usage: value.usage.size ? sortedRecord(value.usage) : undefined,
    role_hypotheses: sortedOptional(value.role_hypotheses),
    specs: value.specs.size
      ? [...value.specs.entries()]
          .sort(([a], [b]) => compareStrings(a, b))
          .map(([, spec]) => spec)
      : undefined,
    sources: [...value.sources].sort(compareStrings),
    resolution_statuses: sortedOptional(value.resolution_statuses),
  });
}

function orderedKinds(rows: ValueRow[]): string[] {
  const present = new Set(rows.map((row) => row.kind));
  const recommended = RECOMMENDED_VALUE_KINDS.filter((kind) =>
    present.has(kind),
  );
  const extras = [...present]
    .filter((kind) => !RECOMMENDED_VALUE_KINDS.includes(kind))
    .sort(compareStrings);
  return [...recommended, ...extras];
}

function sortValues(a: SurveyCatalogValue, b: SurveyCatalogValue): number {
  return (
    compareNumbers(b.occurrences, a.occurrences) ||
    compareNumbers(b.files_count, a.files_count) ||
    compareNumbers(b.rows, a.rows) ||
    compareStrings(a.value, b.value)
  );
}

function sortedRecord(values: Map<string, number>): Record<string, number> {
  return Object.fromEntries(
    [...values.entries()].sort(
      ([aKey, aValue], [bKey, bValue]) =>
        compareNumbers(bValue, aValue) || compareStrings(aKey, bKey),
    ),
  );
}

function sortedOptional(values: Set<string>): string[] | undefined {
  return values.size ? [...values].sort(compareStrings) : undefined;
}

function sourceLabel(source: SurveySource): string {
  return source.id ?? source.target;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function stableJson(value: unknown): string {
  return JSON.stringify(sortJson(value));
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([a], [b]) => compareStrings(a, b))
      .map(([key, child]) => [key, sortJson(child)]),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function compareNumbers(a: number, b: number): number {
  return a === b ? 0 : a < b ? -1 : 1;
}

function compareStrings(a: string, b: string): number {
  return a.localeCompare(b);
}

function pruneUndefined<T extends Record<string, unknown>>(value: T): T {
  for (const key of Object.keys(value)) {
    if (value[key] === undefined) delete value[key];
  }
  return value;
}
