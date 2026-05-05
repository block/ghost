import type {
  SurveyCatalogKind,
  SurveyCatalogValue,
  SurveyValueCatalog,
} from "./catalog-types.js";

export function formatSurveyCatalogMarkdown(
  catalog: SurveyValueCatalog,
): string {
  const lines: string[] = [];

  lines.push("# Survey Value Catalog");
  lines.push("");
  lines.push(
    `Rows: ${catalog.counts.rows} value row(s), ${catalog.counts.values} unique value(s), ${catalog.counts.total_occurrences} occurrence(s)`,
  );
  if (catalog.filter?.kind)
    lines.push(`Filter: kind \`${catalog.filter.kind}\``);
  lines.push("");

  for (const kind of catalog.kinds) appendKind(lines, kind);
  if (catalog.kinds.length === 0) lines.push("No values matched.");

  return `${lines.join("\n").trimEnd()}\n`;
}

function appendKind(lines: string[], kind: SurveyCatalogKind): void {
  lines.push(
    `## ${kind.kind} (${kind.values.length} values, ${kind.rows} rows, ${kind.occurrences} occurrences, ${kind.files_count} file hits)`,
  );
  for (const value of kind.values) lines.push(formatValue(value));
  lines.push("");
}

function formatValue(value: SurveyCatalogValue): string {
  const extras = [
    value.ids.length ? `ids ${formatInlineList(value.ids)}` : undefined,
    value.raws.length ? `raw ${formatInlineList(value.raws)}` : undefined,
    value.usage ? `usage ${formatUsage(value.usage)}` : undefined,
    value.role_hypotheses?.length
      ? `roles ${value.role_hypotheses.join(",")}`
      : undefined,
    value.specs?.length ? `spec ${formatSpec(value.specs[0])}` : undefined,
    value.sources.length
      ? `sources ${formatInlineList(value.sources)}`
      : undefined,
    value.resolution_statuses?.length
      ? `resolution ${value.resolution_statuses.join(",")}`
      : undefined,
  ].filter(Boolean);
  return `- \`${value.value}\` (${value.occurrences}x, ${value.files_count} files, ${value.rows} rows${extras.length ? `; ${extras.join("; ")}` : ""})`;
}

function formatInlineList(values: string[]): string {
  return values.map((value) => `\`${value}\``).join(", ");
}

function formatUsage(usage: Record<string, number>): string {
  return Object.entries(usage)
    .map(([key, value]) => `${key}:${value}`)
    .join(",");
}

function formatSpec(spec: unknown): string {
  const text = stableJson(spec);
  return text.length > 160 ? `${text.slice(0, 157)}...` : text;
}

function stableJson(value: unknown): string {
  return JSON.stringify(sortJson(value));
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, child]) => [key, sortJson(child)]),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
