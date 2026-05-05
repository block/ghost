import type {
  ComponentEvidenceSummary,
  CountSummary,
  ResolutionSummary,
  SurveySummary,
  TokenEvidenceSummary,
  UiSurfaceEvidenceSummary,
  ValueEvidenceSummary,
} from "./summary-types.js";

export function formatSurveySummaryMarkdown(summary: SurveySummary): string {
  const lines: string[] = [];

  lines.push("# Survey Summary");
  lines.push("");
  lines.push(`Budget: \`${summary.budget}\``);
  lines.push(
    `Rows: ${summary.counts.total_rows} total (${summary.counts.values} values, ${summary.counts.tokens} tokens, ${summary.counts.components} components, ${summary.counts.ui_surfaces} UI surfaces)`,
  );
  lines.push("");

  appendSources(lines, summary);
  appendValues(lines, summary);
  appendTokens(lines, summary);
  appendComponents(lines, summary);
  appendSurfaces(lines, summary);

  return `${lines.join("\n").trimEnd()}\n`;
}

function appendSources(lines: string[], summary: SurveySummary): void {
  lines.push("## Sources");
  for (const source of summary.sources) {
    const labels = [
      source.id ? `id=${source.id}` : undefined,
      source.role ? `role=${source.role}` : undefined,
      source.commit ? `commit=${source.commit}` : undefined,
      source.resolves?.length
        ? `resolves=${source.resolves.join(",")}`
        : undefined,
    ].filter(Boolean);
    lines.push(
      `- ${source.target}${labels.length ? ` (${labels.join("; ")})` : ""}`,
    );
  }
  lines.push("");
}

function appendValues(lines: string[], summary: SurveySummary): void {
  lines.push("## Values");
  lines.push(`Total value occurrences: ${summary.values.total_occurrences}`);
  for (const kind of summary.values.kinds) {
    lines.push("");
    lines.push(
      `### ${kind.kind} (${kind.rows} rows, ${kind.occurrences} occurrences, ${kind.files_count} file hits)`,
    );
    appendValueRows(lines, kind.top);
    if (kind.omitted > 0) lines.push(`- ... ${kind.omitted} more row(s)`);
  }
  if (summary.values.arbitrary_or_raw.length > 0) {
    lines.push("");
    lines.push("### Arbitrary Or Raw Exceptions");
    appendValueRows(lines, summary.values.arbitrary_or_raw);
  }
  if (summary.values.unresolved.length > 0) {
    lines.push("");
    lines.push("### Unresolved Values");
    appendValueRows(lines, summary.values.unresolved);
  }
  lines.push("");
}

function appendTokens(lines: string[], summary: SurveySummary): void {
  lines.push("## Tokens");
  lines.push(`Total token occurrences: ${summary.tokens.total_occurrences}`);
  if (summary.tokens.families.length > 0) {
    lines.push("");
    lines.push("Families:");
    appendCountRows(lines, summary.tokens.families);
  }
  if (summary.tokens.alias_depths.length > 0) {
    lines.push("");
    lines.push("Alias depths:");
    appendCountRows(lines, summary.tokens.alias_depths);
  }
  if (summary.tokens.top.length > 0) {
    lines.push("");
    lines.push("Top tokens:");
    appendTokenRows(lines, summary.tokens.top);
  }
  if (summary.tokens.semantic_or_themed.length > 0) {
    lines.push("");
    lines.push("Semantic or themed tokens:");
    appendTokenRows(lines, summary.tokens.semantic_or_themed);
  }
  if (summary.tokens.unresolved.length > 0) {
    lines.push("");
    lines.push("Unresolved tokens:");
    appendTokenRows(lines, summary.tokens.unresolved);
  }
  lines.push("");
}

function appendComponents(lines: string[], summary: SurveySummary): void {
  lines.push("## Components");
  lines.push(
    `${summary.components.top.length + summary.components.omitted} component row(s); ${summary.components.with_variants} with variants, ${summary.components.with_sizes} with sizes.`,
  );
  if (summary.components.discovered_via.length > 0) {
    lines.push("");
    lines.push("Discovered via:");
    appendCountRows(lines, summary.components.discovered_via);
  }
  if (summary.components.top.length > 0) {
    lines.push("");
    appendComponentRows(lines, summary.components.top);
    if (summary.components.omitted > 0) {
      lines.push(`- ... ${summary.components.omitted} more component row(s)`);
    }
  }
  lines.push("");
}

function appendSurfaces(lines: string[], summary: SurveySummary): void {
  lines.push("## UI Surfaces");
  if (summary.ui_surfaces.groups.length > 0) {
    lines.push("");
    lines.push("Groups:");
    for (const group of summary.ui_surfaces.groups) {
      lines.push(`- ${group.key}: ${group.count}`);
      for (const example of group.examples) {
        lines.push(`  - ${formatSurfaceRow(example)}`);
      }
    }
  }
  if (summary.ui_surfaces.surfaces.length > 0) {
    lines.push("");
    lines.push("Representative surfaces:");
    appendSurfaceRows(lines, summary.ui_surfaces.surfaces);
    if (summary.ui_surfaces.omitted > 0) {
      lines.push(`- ... ${summary.ui_surfaces.omitted} more surface row(s)`);
    }
  }
}

function appendValueRows(lines: string[], rows: ValueEvidenceSummary[]): void {
  for (const row of rows) {
    const extras = [
      row.raw !== row.value ? `raw \`${row.raw}\`` : undefined,
      row.role_hypothesis ? `role ${row.role_hypothesis}` : undefined,
      row.usage ? `usage ${formatUsage(row.usage)}` : undefined,
      row.resolution
        ? `resolution ${formatResolution(row.resolution)}`
        : undefined,
      row.source ? `source ${row.source}` : undefined,
    ].filter(Boolean);
    lines.push(
      `- \`${row.id}\` ${row.kind} \`${row.value}\` (${row.occurrences}x, ${row.files_count} files${extras.length ? `; ${extras.join("; ")}` : ""})`,
    );
  }
}

function appendTokenRows(lines: string[], rows: TokenEvidenceSummary[]): void {
  for (const row of rows) {
    const extras = [
      `depth ${row.alias_depth}`,
      row.alias_chain?.length
        ? `chain ${row.alias_chain.join(" -> ")}`
        : undefined,
      row.by_theme
        ? `themes ${Object.keys(row.by_theme).sort(compareStrings).join(",")}`
        : undefined,
      row.resolution
        ? `resolution ${formatResolution(row.resolution)}`
        : undefined,
      row.source ? `source ${row.source}` : undefined,
    ].filter(Boolean);
    lines.push(
      `- \`${row.id}\` \`${row.name}\` -> \`${row.resolved_value}\` (${row.occurrences}x; ${extras.join("; ")})`,
    );
  }
}

function appendComponentRows(
  lines: string[],
  rows: ComponentEvidenceSummary[],
): void {
  for (const row of rows) {
    const extras = [
      row.variants?.length ? `variants ${row.variants.join(",")}` : undefined,
      row.sizes?.length ? `sizes ${row.sizes.join(",")}` : undefined,
      row.source ? `source ${row.source}` : undefined,
    ].filter(Boolean);
    lines.push(
      `- \`${row.id}\` ${row.name} (${row.discovered_via}${extras.length ? `; ${extras.join("; ")}` : ""})`,
    );
  }
}

function appendSurfaceRows(
  lines: string[],
  rows: UiSurfaceEvidenceSummary[],
): void {
  for (const row of rows) lines.push(`- ${formatSurfaceRow(row)}`);
}

function appendCountRows(lines: string[], rows: CountSummary[]): void {
  for (const row of rows) {
    const occurrences =
      row.occurrences !== undefined && row.occurrences !== row.count
        ? `, ${row.occurrences} occurrences`
        : "";
    lines.push(`- ${row.name}: ${row.count}${occurrences}`);
  }
}

function formatSurfaceRow(row: UiSurfaceEvidenceSummary): string {
  const c = row.classification;
  const tags = [c?.layout_shape, c?.density, c?.surface_type, c?.intent].filter(
    Boolean,
  );
  const signals = [
    row.signals.layout_patterns?.length
      ? `patterns ${row.signals.layout_patterns.join(",")}`
      : undefined,
    row.signals.dominant_components?.length
      ? `components ${row.signals.dominant_components.join(",")}`
      : undefined,
    row.signals.value_refs?.length
      ? `value_refs ${row.signals.value_refs.join(",")}`
      : undefined,
    row.signals.notes?.length
      ? `notes ${row.signals.notes.join(" | ")}`
      : undefined,
    row.source ? `source ${row.source}` : undefined,
  ].filter(Boolean);
  return `\`${row.id}\` ${row.name} (${row.kind} ${row.locator}; ${row.renderability}; ${row.files_count} files${tags.length ? `; ${tags.join(", ")}` : ""}${signals.length ? `; ${signals.join("; ")}` : ""})`;
}

function formatUsage(usage: Record<string, number>): string {
  return Object.entries(usage)
    .map(([key, value]) => `${key}:${value}`)
    .join(",");
}

function formatResolution(resolution: ResolutionSummary): string {
  const parts = [
    resolution.status,
    resolution.source_id,
    resolution.symbol,
    resolution.chain?.length ? resolution.chain.join(" -> ") : undefined,
    resolution.message,
  ].filter(Boolean);
  return parts.join("/");
}

function compareStrings(a: string, b: string): number {
  return a.localeCompare(b);
}
