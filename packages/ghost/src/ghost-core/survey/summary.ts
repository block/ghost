import { RECOMMENDED_VALUE_KINDS } from "./schema.js";
import { BUDGET_LIMITS } from "./summary-budget.js";

export { formatSurveySummaryMarkdown } from "./summary-format.js";

import type {
  BudgetLimits,
  ComponentEvidenceSummary,
  CountSummary,
  ResolutionSummary,
  SurveyComponentsSummary,
  SurveySourceSummary,
  SurveySummary,
  SurveySummaryOptions,
  SurveyTokensSummary,
  SurveyUiSurfacesSummary,
  SurveyValuesSummary,
  TokenEvidenceSummary,
  UiSurfaceEvidenceSummary,
  UiSurfaceGroupSummary,
  ValueEvidenceSummary,
  ValueKindSummary,
} from "./summary-types.js";

export type {
  ComponentEvidenceSummary,
  CountSummary,
  ResolutionSummary,
  SurveyComponentsSummary,
  SurveySourceSummary,
  SurveySummary,
  SurveySummaryBudget,
  SurveySummaryCounts,
  SurveySummaryOptions,
  SurveyTokensSummary,
  SurveyUiSurfacesSummary,
  SurveyValuesSummary,
  TokenEvidenceSummary,
  UiSurfaceEvidenceSummary,
  UiSurfaceGroupSummary,
  ValueEvidenceSummary,
  ValueKindSummary,
} from "./summary-types.js";

import type {
  ComponentRow,
  Resolution,
  Survey,
  SurveySource,
  TokenRow,
  UiSurfaceRow,
  UiSurfaceSignals,
  ValueRow,
} from "./types.js";

const SEMANTIC_TOKEN_PATTERN =
  /(?:^|[-_:./])(?:background|foreground|surface|primary|secondary|accent|muted|border|input|ring|focus|success|warning|error|danger|destructive|info|brand|text)(?:$|[-_:./])/i;

export function summarizeSurvey(
  survey: Survey,
  options: SurveySummaryOptions = {},
): SurveySummary {
  const budget = options.budget ?? "standard";
  const limits = BUDGET_LIMITS[budget];

  return {
    schema: "ghost.survey.summary/v1",
    source_schema: survey.schema,
    budget,
    counts: {
      sources: survey.sources.length,
      values: survey.values.length,
      tokens: survey.tokens.length,
      components: survey.components.length,
      ui_surfaces: survey.ui_surfaces.length,
      total_rows:
        survey.values.length +
        survey.tokens.length +
        survey.components.length +
        survey.ui_surfaces.length,
    },
    sources: survey.sources.map(summarizeSource),
    values: summarizeValues(survey.values, limits),
    tokens: summarizeTokens(survey.tokens, limits),
    components: summarizeComponents(survey.components, limits),
    ui_surfaces: summarizeUiSurfaces(survey.ui_surfaces, limits),
  };
}

function summarizeValues(
  rows: ValueRow[],
  limits: BudgetLimits,
): SurveyValuesSummary {
  const sortedRows = sortValueRows(rows);
  return {
    total_occurrences: sum(rows.map((row) => row.occurrences)),
    kinds: orderedKinds(rows).map((kind) =>
      summarizeValueKind(kind, rows, limits),
    ),
    arbitrary_or_raw: sortedRows
      .filter(isArbitraryOrRawValue)
      .slice(0, limits.arbitraryValues)
      .map((row) => summarizeValueRow(row, limits)),
    unresolved: sortedRows
      .filter((row) => row.resolution?.status?.startsWith("unresolved"))
      .slice(0, limits.unresolvedValues)
      .map((row) => summarizeValueRow(row, limits)),
  };
}

function summarizeValueKind(
  kind: string,
  rows: ValueRow[],
  limits: BudgetLimits,
): ValueKindSummary {
  const kindRows = sortValueRows(rows.filter((row) => row.kind === kind));
  return {
    kind,
    rows: kindRows.length,
    occurrences: sum(kindRows.map((row) => row.occurrences)),
    files_count: sum(kindRows.map((row) => row.files_count)),
    top: kindRows
      .slice(0, limits.valuesPerKind)
      .map((row) => summarizeValueRow(row, limits)),
    omitted: Math.max(0, kindRows.length - limits.valuesPerKind),
  };
}

function summarizeTokens(
  rows: TokenRow[],
  limits: BudgetLimits,
): SurveyTokensSummary {
  const sortedRows = sortTokenRows(rows);
  return {
    total_occurrences: sum(rows.map((row) => row.occurrences)),
    families: countBy(
      rows,
      (row) => tokenFamily(row.name),
      (row) => row.occurrences,
    ).slice(0, limits.tokenFamilies),
    alias_depths: countBy(
      rows,
      (row) => String(row.alias_chain.length),
      (row) => row.occurrences,
    ).slice(0, limits.tokenAliasDepths),
    top: sortedRows
      .slice(0, limits.tokens)
      .map((row) => summarizeTokenRow(row, limits)),
    semantic_or_themed: sortedRows
      .filter((row) => row.by_theme || SEMANTIC_TOKEN_PATTERN.test(row.name))
      .slice(0, limits.themedTokens)
      .map((row) => summarizeTokenRow(row, limits)),
    unresolved: sortedRows
      .filter((row) => row.resolution?.status?.startsWith("unresolved"))
      .slice(0, limits.unresolvedTokens)
      .map((row) => summarizeTokenRow(row, limits)),
  };
}

function summarizeComponents(
  rows: ComponentRow[],
  limits: BudgetLimits,
): SurveyComponentsSummary {
  const sortedRows = sortComponentRows(rows);
  return {
    discovered_via: countBy(rows, (row) => row.discovered_via).slice(
      0,
      limits.componentSources,
    ),
    with_variants: rows.filter((row) => row.variants?.length).length,
    with_sizes: rows.filter((row) => row.sizes?.length).length,
    top: sortedRows
      .slice(0, limits.components)
      .map((row) => summarizeComponentRow(row, limits)),
    omitted: Math.max(0, rows.length - limits.components),
  };
}

function summarizeUiSurfaces(
  rows: UiSurfaceRow[],
  limits: BudgetLimits,
): SurveyUiSurfacesSummary {
  const sortedRows = sortUiSurfaceRows(rows);
  return {
    groups: countBy(rows, surfaceGroupKey)
      .slice(0, limits.surfaceGroups)
      .map(
        (group): UiSurfaceGroupSummary => ({
          key: group.name,
          count: group.count,
          examples: sortedRows
            .filter((row) => surfaceGroupKey(row) === group.name)
            .slice(0, limits.groupExamples)
            .map((row) => summarizeUiSurfaceRow(row, limits)),
        }),
      ),
    surfaces: sortedRows
      .slice(0, limits.surfaces)
      .map((row) => summarizeUiSurfaceRow(row, limits)),
    omitted: Math.max(0, rows.length - limits.surfaces),
  };
}

function summarizeSource(source: SurveySource): SurveySourceSummary {
  return {
    id: source.id,
    role: source.role,
    target: source.target,
    commit: source.commit,
    scanned_at: source.scanned_at,
    scanner_version: source.scanner_version,
    resolves: source.resolves,
  };
}

function summarizeValueRow(
  row: ValueRow,
  limits: BudgetLimits,
): ValueEvidenceSummary {
  return pruneUndefined({
    id: row.id,
    kind: row.kind,
    value: row.value,
    raw: row.raw,
    occurrences: row.occurrences,
    files_count: row.files_count,
    usage: row.usage ? topUsage(row.usage, limits.signalItems) : undefined,
    role_hypothesis: row.role_hypothesis,
    source: sourceLabel(row.source),
    resolution: row.resolution
      ? summarizeResolution(row.resolution, limits)
      : undefined,
  });
}

function summarizeTokenRow(
  row: TokenRow,
  limits: BudgetLimits,
): TokenEvidenceSummary {
  return pruneUndefined({
    id: row.id,
    name: row.name,
    resolved_value: row.resolved_value,
    occurrences: row.occurrences,
    alias_depth: row.alias_chain.length,
    alias_chain:
      row.alias_chain.length > 0
        ? row.alias_chain.slice(0, limits.resolutionChain)
        : undefined,
    by_theme: row.by_theme,
    source: sourceLabel(row.source),
    resolution: row.resolution
      ? summarizeResolution(row.resolution, limits)
      : undefined,
  });
}

function summarizeComponentRow(
  row: ComponentRow,
  limits: BudgetLimits,
): ComponentEvidenceSummary {
  return pruneUndefined({
    id: row.id,
    name: row.name,
    discovered_via: row.discovered_via,
    variants: row.variants?.slice(0, limits.signalItems),
    sizes: row.sizes?.slice(0, limits.signalItems),
    source: sourceLabel(row.source),
  });
}

function summarizeUiSurfaceRow(
  row: UiSurfaceRow,
  limits: BudgetLimits,
): UiSurfaceEvidenceSummary {
  return pruneUndefined({
    id: row.id,
    name: row.name,
    kind: row.kind,
    locator: row.locator,
    renderability: row.renderability,
    files_count: row.files.length,
    classification: row.classification,
    signals: summarizeSignals(row.signals, limits),
    source: sourceLabel(row.source),
  });
}

function summarizeSignals(
  signals: UiSurfaceSignals,
  limits: BudgetLimits,
): UiSurfaceSignals {
  return pruneUndefined({
    dominant_components: signals.dominant_components?.slice(
      0,
      limits.signalItems,
    ),
    layout_patterns: signals.layout_patterns?.slice(0, limits.signalItems),
    breakpoint_behavior: signals.breakpoint_behavior?.slice(
      0,
      limits.signalItems,
    ),
    value_refs: signals.value_refs?.slice(0, limits.signalItems),
    notes: signals.notes?.slice(0, limits.signalItems),
  });
}

function summarizeResolution(
  resolution: Resolution,
  limits: BudgetLimits,
): ResolutionSummary {
  return pruneUndefined({
    status: resolution.status,
    source_id: resolution.source_id,
    target: resolution.target,
    symbol: resolution.symbol,
    chain: resolution.chain?.slice(0, limits.resolutionChain),
    message: resolution.message,
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

function sortValueRows(rows: ValueRow[]): ValueRow[] {
  return [...rows].sort(
    (a, b) =>
      compareNumbers(b.occurrences, a.occurrences) ||
      compareNumbers(b.files_count, a.files_count) ||
      compareStrings(a.value, b.value) ||
      compareStrings(a.raw, b.raw) ||
      compareStrings(a.id, b.id),
  );
}

function sortTokenRows(rows: TokenRow[]): TokenRow[] {
  return [...rows].sort(
    (a, b) =>
      compareNumbers(b.occurrences, a.occurrences) ||
      compareNumbers(b.alias_chain.length, a.alias_chain.length) ||
      compareStrings(a.name, b.name) ||
      compareStrings(a.id, b.id),
  );
}

function sortComponentRows(rows: ComponentRow[]): ComponentRow[] {
  return [...rows].sort(
    (a, b) =>
      compareStrings(a.discovered_via, b.discovered_via) ||
      compareStrings(a.name, b.name) ||
      compareStrings(a.id, b.id),
  );
}

function sortUiSurfaceRows(rows: UiSurfaceRow[]): UiSurfaceRow[] {
  return [...rows].sort(
    (a, b) =>
      compareStrings(surfaceGroupKey(a), surfaceGroupKey(b)) ||
      compareStrings(a.name, b.name) ||
      compareStrings(a.locator, b.locator) ||
      compareStrings(a.id, b.id),
  );
}

function countBy<T>(
  rows: T[],
  keyFor: (row: T) => string,
  occurrencesFor: (row: T) => number = () => 1,
): CountSummary[] {
  const counts = new Map<string, { count: number; occurrences: number }>();
  for (const row of rows) {
    const name = keyFor(row) || "unknown";
    const existing = counts.get(name) ?? { count: 0, occurrences: 0 };
    existing.count += 1;
    existing.occurrences += occurrencesFor(row);
    counts.set(name, existing);
  }
  return [...counts.entries()]
    .map(([name, value]) => ({
      name,
      count: value.count,
      occurrences: value.occurrences,
    }))
    .sort(
      (a, b) =>
        compareNumbers(b.count, a.count) ||
        compareNumbers(b.occurrences ?? 0, a.occurrences ?? 0) ||
        compareStrings(a.name, b.name),
    );
}

function topUsage(
  usage: Record<string, number>,
  limit: number,
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(usage)
      .sort(
        ([aKey, aValue], [bKey, bValue]) =>
          compareNumbers(bValue, aValue) || compareStrings(aKey, bKey),
      )
      .slice(0, limit),
  );
}

function tokenFamily(name: string): string {
  const parts = name
    .replace(/^--/, "")
    .split(/[-_:./[\]\s]+/)
    .filter(Boolean);
  if (parts.length === 0) return "unknown";
  const first = parts[0].toLowerCase();
  if (
    ["color", "colors", "font", "text", "spacing", "space", "radius"].includes(
      first,
    ) &&
    parts[1]
  ) {
    return `${first}/${parts[1].toLowerCase()}`;
  }
  return first;
}

function surfaceGroupKey(row: UiSurfaceRow): string {
  const c = row.classification;
  return [
    c?.layout_shape ?? "unknown-shape",
    c?.density ?? "unknown-density",
    c?.surface_type ?? c?.intent ?? row.kind,
  ].join(" / ");
}

function isArbitraryOrRawValue(row: ValueRow): boolean {
  const usageKeys = Object.keys(row.usage ?? {});
  return (
    /\[[^\]]+\]/.test(row.raw) ||
    /\b(?:calc|clamp|min|max)\(/.test(row.raw) ||
    usageKeys.some((key) => /arbitrary|inline|literal/i.test(key)) ||
    (row.raw.startsWith("var(") && !row.resolution)
  );
}

function sourceLabel(source: SurveySource): string | undefined {
  return source.id ?? source.target;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
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
