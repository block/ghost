import type {
  Fingerprint,
  GhostChecksDocument,
  MapFrontmatter,
  SurveySummary,
  SurveySummaryBudget,
} from "@ghost/core";

export type ViewerArtifactName =
  | "profile.md"
  | "survey.json"
  | "map.md"
  | "checks.yml";
export type ViewerArtifactState = "included" | "missing" | "invalid";

export interface ViewerArtifactStatus {
  name: ViewerArtifactName;
  state: ViewerArtifactState;
  path?: string;
  message?: string;
}

export interface BuildFingerprintViewerHtmlInput {
  fingerprint: Fingerprint;
  sourcePath?: string;
  generatedAt?: string;
  surveySummary?: SurveySummary;
  surveyBudget?: SurveySummaryBudget;
  map?: MapFrontmatter;
  checks?: GhostChecksDocument;
  artifacts?: ViewerArtifactStatus[];
  warnings?: string[];
}

export function buildFingerprintViewerHtml(
  input: BuildFingerprintViewerHtmlInput,
): string {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const artifacts = input.artifacts ?? [
    { name: "profile.md", state: "included", path: input.sourcePath },
  ];
  const title = `${input.fingerprint.id} fingerprint viewer`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>${buildCss()}</style>
</head>
<body>
  <div class="shell">
    ${renderHeader(input, generatedAt, artifacts)}
    ${renderTabs()}
    <main>
      ${renderOverview(input.fingerprint)}
      ${renderValues(input.fingerprint)}
      ${renderDecisions(input.fingerprint, input.checks)}
      ${renderEvidence(input.surveySummary, input.surveyBudget)}
      ${renderTopology(input.map)}
    </main>
  </div>
  <script>${buildJs()}</script>
</body>
</html>
`;
}

function renderHeader(
  input: BuildFingerprintViewerHtmlInput,
  generatedAt: string,
  artifacts: ViewerArtifactStatus[],
): string {
  const fp = input.fingerprint;
  const warnings = input.warnings ?? [];
  return `<header class="hero" id="top">
    <div>
      <p class="eyebrow">Ghost fingerprint viewer</p>
      <h1>${escapeHtml(fp.id)}</h1>
      <div class="meta">
        <span>${escapeHtml(fp.source)}</span>
        <span>${escapeHtml(fp.timestamp)}</span>
        <span>Generated ${escapeHtml(generatedAt)}</span>
      </div>
    </div>
    <div class="hero-panel">
      <label for="global-search">Search this viewer</label>
      <input id="global-search" type="search" placeholder="Filter decisions, checks, tokens, surfaces">
      <div class="status-grid">${artifacts.map(renderArtifactStatus).join("")}</div>
      ${
        warnings.length
          ? `<div class="warnings">${warnings.map((w) => `<p>${escapeHtml(w)}</p>`).join("")}</div>`
          : ""
      }
    </div>
  </header>`;
}

function renderArtifactStatus(status: ViewerArtifactStatus): string {
  return `<div class="artifact ${escapeHtml(status.state)}">
    <span>${escapeHtml(status.name)}</span>
    <strong>${escapeHtml(status.state)}</strong>
    ${status.path ? `<small>${escapeHtml(status.path)}</small>` : ""}
    ${status.message ? `<small>${escapeHtml(status.message)}</small>` : ""}
  </div>`;
}

function renderTabs(): string {
  const tabs = [
    ["overview", "Overview"],
    ["values", "Values"],
    ["decisions", "Decisions"],
    ["evidence", "Evidence"],
    ["topology", "Topology"],
  ];
  return `<nav class="tabs" aria-label="Viewer sections">
    ${tabs
      .map(
        ([id, label], index) =>
          `<button type="button" class="tab${index === 0 ? " active" : ""}" data-tab="${id}">${label}</button>`,
      )
      .join("")}
  </nav>`;
}

function renderOverview(fingerprint: Fingerprint): string {
  const observation = fingerprint.observation;
  return `<section class="panel active" id="overview" data-panel="overview">
    ${sectionHead("overview", "Overview")}
    <div class="two-col">
      <article class="block searchable" data-search="${searchText([
        observation?.summary,
        observation?.personality,
        observation?.resembles,
        fingerprint.signature,
      ])}">
        <h3>Character</h3>
        <p>${escapeHtml(observation?.summary || "No character summary has been authored yet.")}</p>
        ${renderTags("Personality", observation?.personality)}
        ${renderTags("Resembles", observation?.resembles)}
      </article>
      <article class="block searchable" data-search="${searchText([fingerprint.signature])}">
        <h3>Signature</h3>
        <p>${escapeHtml(fingerprint.signature || "No signature prose has been authored yet.")}</p>
      </article>
    </div>
    <div class="block">
      <h3>References</h3>
      <div class="reference-grid">
        ${renderReferenceGroup("Specs", fingerprint.references?.specs)}
        ${renderReferenceGroup("Components", fingerprint.references?.components)}
        ${renderReferenceGroup("Examples", fingerprint.references?.examples)}
      </div>
    </div>
  </section>`;
}

function renderValues(fingerprint: Fingerprint): string {
  return `<section class="panel" id="values" data-panel="values" hidden>
    ${sectionHead("values", "Values")}
    <div class="block">
      <h3>Palette</h3>
      <div class="swatch-grid">
        ${fingerprint.palette.dominant.map((c) => renderSwatch(c.role, c.value, "dominant")).join("")}
        ${fingerprint.palette.semantic.map((c) => renderSwatch(c.role, c.value, "semantic")).join("")}
      </div>
      <div class="neutral-ramp">${fingerprint.palette.neutrals.steps
        .map((value, index) =>
          renderSwatch(`step ${index + 1}`, value, "neutral"),
        )
        .join("")}</div>
      <p class="fine">Saturation: ${escapeHtml(fingerprint.palette.saturationProfile)}. Contrast: ${escapeHtml(
        fingerprint.palette.contrast,
      )}.</p>
    </div>
    <div class="metric-grid">
      ${renderMetricBlock(
        "Spacing scale",
        fingerprint.spacing.scale.map((v) => `${v}px`),
        [
          `Base unit: ${fingerprint.spacing.baseUnit ?? "none"}`,
          `Regularity: ${fingerprint.spacing.regularity}`,
        ],
      )}
      ${renderMetricBlock(
        "Type ramp",
        fingerprint.typography.sizeRamp.map((v) => `${v}px`),
        [
          `Families: ${fingerprint.typography.families.join(", ") || "none"}`,
          `Line height: ${fingerprint.typography.lineHeightPattern}`,
        ],
      )}
      ${renderMetricBlock(
        "Weights",
        Object.entries(fingerprint.typography.weightDistribution).map(
          ([k, v]) => `${k}: ${v}`,
        ),
        [],
      )}
      ${renderMetricBlock(
        "Surfaces",
        fingerprint.surfaces.borderRadii.map((v) => `${v}px`),
        [
          `Shadows: ${fingerprint.surfaces.shadowComplexity}`,
          `Borders: ${fingerprint.surfaces.borderUsage}`,
          fingerprint.surfaces.borderTokenCount !== undefined
            ? `Border tokens: ${fingerprint.surfaces.borderTokenCount}`
            : undefined,
        ],
      )}
    </div>
  </section>`;
}

function renderDecisions(
  fingerprint: Fingerprint,
  checks: GhostChecksDocument | undefined,
): string {
  const decisions = fingerprint.decisions ?? [];
  return `<section class="panel" id="decisions" data-panel="decisions" hidden>
    ${sectionHead("decisions", "Decisions")}
    <div class="list">
      ${
        decisions.length
          ? decisions.map(renderDecision).join("")
          : `<p class="empty">No decisions have been authored yet.</p>`
      }
    </div>
    <div class="block">
      <h3>Checks</h3>
      ${
        checks?.checks.length
          ? `<div class="list">${checks.checks.map(renderCheck).join("")}</div>`
          : `<p class="empty">No package checks were included.</p>`
      }
    </div>
  </section>`;
}

function renderEvidence(
  summary: SurveySummary | undefined,
  budget: SurveySummaryBudget | undefined,
): string {
  if (!summary) {
    return `<section class="panel" id="evidence" data-panel="evidence" hidden>
      ${sectionHead("evidence", "Evidence")}
      <p class="empty">No survey summary was included.</p>
    </section>`;
  }
  return `<section class="panel" id="evidence" data-panel="evidence" hidden>
    ${sectionHead("evidence", "Evidence")}
    <div class="metric-grid">
      ${renderCountCard("Sources", summary.counts.sources)}
      ${renderCountCard("Values", summary.counts.values)}
      ${renderCountCard("Tokens", summary.counts.tokens)}
      ${renderCountCard("Components", summary.counts.components)}
      ${renderCountCard("UI surfaces", summary.counts.ui_surfaces)}
    </div>
    <p class="fine">Survey budget: ${escapeHtml(budget ?? summary.budget)}</p>
    <div class="block">
      <h3>Top values</h3>
      ${summary.values.kinds.map(renderValueKind).join("") || `<p class="empty">No value rows recorded.</p>`}
    </div>
    <div class="block">
      <h3>Tokens</h3>
      ${renderTokenTable(summary)}
    </div>
    <div class="block">
      <h3>Components</h3>
      ${renderComponentTable(summary)}
    </div>
    <div class="block">
      <h3>UI surfaces</h3>
      ${renderSurfaceTable(summary)}
    </div>
  </section>`;
}

function renderTopology(map: MapFrontmatter | undefined): string {
  if (!map) {
    return `<section class="panel" id="topology" data-panel="topology" hidden>
      ${sectionHead("topology", "Topology")}
      <p class="empty">No map frontmatter was included.</p>
    </section>`;
  }
  return `<section class="panel" id="topology" data-panel="topology" hidden>
    ${sectionHead("topology", "Topology")}
    <div class="metric-grid">
      ${renderMetricBlock("Platform", toList(map.platform), [`Repo: ${map.repo}`, `Mapped: ${map.mapped_at}`])}
      ${renderMetricBlock("Build", toList(map.build_system), [
        `Rendering: ${map.composition.rendering}`,
        `Styling: ${map.composition.styling.join(", ")}`,
      ])}
      ${renderMetricBlock(
        "Languages",
        map.languages.map((l) => `${l.name} ${Math.round(l.share * 100)}%`),
        [],
      )}
      ${renderMetricBlock("Design system", map.design_system.paths, [
        `Status: ${map.design_system.status}`,
        map.design_system.token_source
          ? `Token source: ${map.design_system.token_source}`
          : undefined,
      ])}
    </div>
    <div class="two-col">
      <div class="block">
        <h3>Surface sources</h3>
        ${renderList("Include", map.surface_sources.include)}
        ${renderList("Exclude", map.surface_sources.exclude)}
        <p class="fine">Render strategy: ${escapeHtml(map.surface_sources.render_strategy)}</p>
      </div>
      <div class="block">
        <h3>Feature areas</h3>
        <div class="list">${map.feature_areas
          .map(
            (
              area,
            ) => `<article class="item searchable" data-search="${searchText([area.name, area.paths, area.sub_areas])}">
              <h4>${escapeHtml(area.name)}</h4>
              <p>${escapeHtml(area.paths.join(", "))}</p>
              ${area.sub_areas?.length ? `<p class="fine">${escapeHtml(area.sub_areas.join(", "))}</p>` : ""}
            </article>`,
          )
          .join("")}</div>
      </div>
    </div>
  </section>`;
}

function renderTags(label: string, values: string[] | undefined): string {
  if (!values?.length) return "";
  return `<div class="tag-group"><span>${escapeHtml(label)}</span>${values
    .map((v) => `<b>${escapeHtml(v)}</b>`)
    .join("")}</div>`;
}

function renderReferenceGroup(
  label: string,
  values: string[] | undefined,
): string {
  return `<div class="reference searchable" data-search="${searchText([label, values])}">
    <h4>${escapeHtml(label)}</h4>
    ${
      values?.length
        ? `<ul>${values.map((v) => `<li><code>${escapeHtml(v)}</code></li>`).join("")}</ul>`
        : `<p class="empty">None promoted yet.</p>`
    }
  </div>`;
}

function renderSwatch(role: string, value: string, kind: string): string {
  const color = safeCssColor(value);
  const style = color ? ` style="--swatch:${color}"` : "";
  return `<div class="swatch searchable" data-search="${searchText([role, value, kind])}">
    <span class="chip${color ? "" : " unresolved"}"${style}></span>
    <strong>${escapeHtml(role)}</strong>
    <code>${escapeHtml(value)}</code>
    <small>${escapeHtml(kind)}</small>
  </div>`;
}

function renderMetricBlock(
  title: string,
  values: Array<string | number>,
  notes: Array<string | undefined>,
): string {
  return `<article class="block searchable" data-search="${searchText([title, values, notes])}">
    <h3>${escapeHtml(title)}</h3>
    ${
      values.length
        ? `<div class="pill-row">${values.map((v) => `<span>${escapeHtml(v)}</span>`).join("")}</div>`
        : `<p class="empty">None recorded.</p>`
    }
    ${notes
      .filter(Boolean)
      .map((note) => `<p class="fine">${escapeHtml(note)}</p>`)
      .join("")}
  </article>`;
}

function renderDecision(
  decision: NonNullable<Fingerprint["decisions"]>[number],
): string {
  return `<article class="item searchable" data-search="${searchText([
    decision.dimension,
    decision.dimension_kind,
    decision.decision,
    decision.evidence,
  ])}">
    <div class="item-head">
      <h3>${escapeHtml(decision.dimension)}</h3>
      ${decision.dimension_kind ? `<span>${escapeHtml(decision.dimension_kind)}</span>` : ""}
    </div>
    <p>${escapeHtml(decision.decision || "No rationale prose has been authored yet.")}</p>
    ${renderList("Evidence", decision.evidence)}
  </article>`;
}

function renderCheck(check: GhostChecksDocument["checks"][number]): string {
  const detector = [
    check.detector.type,
    check.detector.pattern,
    check.detector.value,
    check.detector.contexts?.join(", "),
  ].filter(Boolean);
  return `<article class="item searchable" data-search="${searchText([
    check.id,
    check.title,
    check.status,
    check.severity,
    detector,
    check.repair,
  ])}">
    <div class="item-head">
      <h3>${escapeHtml(check.title)}</h3>
      <span>${escapeHtml(check.severity)} / ${escapeHtml(check.status)}</span>
    </div>
    <p><code>${escapeHtml(check.id)}</code></p>
    <p>${escapeHtml(detector.join(" - "))}</p>
    ${
      check.evidence
        ? `<p class="fine">Support: ${escapeHtml(check.evidence.support ?? "n/a")}. Observed: ${escapeHtml(
            check.evidence.observed_count ?? "n/a",
          )}.</p>`
        : ""
    }
    ${check.repair ? `<p>${escapeHtml(check.repair)}</p>` : ""}
  </article>`;
}

function renderValueKind(
  kind: SurveySummary["values"]["kinds"][number],
): string {
  return `<div class="subsection searchable" data-search="${searchText([kind.kind])}">
    <h4>${escapeHtml(kind.kind)} <span>${kind.rows} rows, ${kind.occurrences} uses</span></h4>
    ${table(
      ["Value", "Raw", "Occurrences", "Files", "Role"],
      kind.top.map((row) => [
        code(row.value),
        code(row.raw),
        String(row.occurrences),
        String(row.files_count),
        row.role_hypothesis ?? "",
      ]),
    )}
    ${kind.omitted > 0 ? `<p class="fine">${kind.omitted} more row(s) omitted by the summary budget.</p>` : ""}
  </div>`;
}

function renderTokenTable(summary: SurveySummary): string {
  const rows = [...summary.tokens.top, ...summary.tokens.semantic_or_themed];
  if (!rows.length) return `<p class="empty">No token rows recorded.</p>`;
  return table(
    ["Token", "Resolved", "Uses", "Depth"],
    rows.map((row) => [
      code(row.name),
      code(row.resolved_value),
      String(row.occurrences),
      String(row.alias_depth),
    ]),
  );
}

function renderComponentTable(summary: SurveySummary): string {
  const rows = summary.components.top;
  if (!rows.length) return `<p class="empty">No component rows recorded.</p>`;
  return table(
    ["Name", "Discovered via", "Variants", "Sizes"],
    rows.map((row) => [
      row.name,
      row.discovered_via,
      row.variants?.join(", ") ?? "",
      row.sizes?.join(", ") ?? "",
    ]),
  );
}

function renderSurfaceTable(summary: SurveySummary): string {
  const rows = summary.ui_surfaces.surfaces;
  if (!rows.length) return `<p class="empty">No UI surface rows recorded.</p>`;
  return table(
    ["Name", "Kind", "Locator", "Renderability", "Shape"],
    rows.map((row) => [
      row.name,
      row.kind,
      code(row.locator),
      row.renderability,
      row.classification?.layout_shape ?? "",
    ]),
  );
}

function renderCountCard(label: string, value: number): string {
  return `<article class="count-card">
    <span>${escapeHtml(label)}</span>
    <strong>${escapeHtml(value)}</strong>
  </article>`;
}

function renderList(label: string, values: string[] | undefined): string {
  if (!values?.length) return "";
  return `<div class="list-block">
    <h4>${escapeHtml(label)}</h4>
    <ul>${values.map((v) => `<li>${escapeHtml(v)}</li>`).join("")}</ul>
  </div>`;
}

function sectionHead(id: string, title: string): string {
  return `<div class="section-head">
    <h2>${escapeHtml(title)}</h2>
    <button type="button" class="copy-anchor" data-copy-anchor="#${escapeHtml(id)}">Copy anchor</button>
  </div>`;
}

type TableCell = string | { html: string; text: string };

function table(headers: string[], rows: TableCell[][]): string {
  return `<div class="table-wrap"><table>
    <thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>
    <tbody>${rows
      .map(
        (row) =>
          `<tr class="searchable" data-search="${searchText(row.map(cellText))}">${row.map((cell) => `<td>${cellHtml(cell)}</td>`).join("")}</tr>`,
      )
      .join("")}</tbody>
  </table></div>`;
}

function code(value: string): TableCell {
  return { html: `<code>${escapeHtml(value)}</code>`, text: value };
}

function cellHtml(cell: TableCell): string {
  return typeof cell === "string" ? escapeHtml(cell) : cell.html;
}

function cellText(cell: TableCell): string {
  return typeof cell === "string" ? cell : cell.text;
}

function toList(value: string | string[]): string[] {
  return Array.isArray(value) ? value : [value];
}

function searchText(value: unknown): string {
  const flat = flatten(value)
    .map((item) => String(item))
    .join(" ")
    .toLowerCase();
  return escapeHtml(flat);
}

function flatten(value: unknown): unknown[] {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) return value.flatMap(flatten);
  return [value];
}

function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeCssColor(value: string): string | null {
  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{3,8}$/.test(trimmed)) return trimmed;
  if (/^rgba?\([\d\s.,%/+-]+\)$/.test(trimmed)) return trimmed;
  if (/^hsla?\([\d\s.,%/a-zA-Z+-]+\)$/.test(trimmed)) return trimmed;
  if (/^oklch\([\d\s.,%/a-zA-Z+-]+\)$/.test(trimmed)) return trimmed;
  return null;
}

function buildCss(): string {
  return `
:root {
  color-scheme: light;
  --bg: #f7f7f4;
  --panel: #ffffff;
  --ink: #171717;
  --muted: #62645f;
  --line: #d9d9d2;
  --soft: #eeeeea;
  --accent: #0f766e;
  --accent-soft: #d9f3ef;
  --warn: #8a4b0f;
  --warn-soft: #fff3d7;
  --bad: #a32626;
  --bad-soft: #ffe2e2;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font-size: 14px;
  line-height: 1.5;
}
.shell {
  width: min(1180px, calc(100vw - 32px));
  margin: 0 auto;
  padding: 28px 0 56px;
}
.hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 420px;
  gap: 24px;
  align-items: start;
  border-bottom: 1px solid var(--line);
  padding-bottom: 24px;
}
.eyebrow {
  margin: 0 0 10px;
  color: var(--accent);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}
h1 {
  margin: 0;
  font-size: 44px;
  line-height: 1;
  letter-spacing: 0;
}
h2, h3, h4, p { margin-top: 0; }
.meta, .tag-group, .pill-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.meta { margin-top: 14px; color: var(--muted); }
.meta span, .pill-row span, .tag-group b {
  border: 1px solid var(--line);
  background: var(--panel);
  border-radius: 999px;
  padding: 4px 9px;
}
.hero-panel, .block, .item, .count-card, .reference {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 8px;
}
.hero-panel { padding: 16px; }
label {
  display: block;
  margin-bottom: 8px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 700;
}
input {
  width: 100%;
  height: 40px;
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 0 12px;
  font: inherit;
}
.status-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 12px;
}
.artifact {
  border-radius: 6px;
  padding: 9px;
  background: var(--soft);
}
.artifact span, .artifact small { display: block; color: var(--muted); }
.artifact strong { display: block; font-size: 13px; }
.artifact.included { background: var(--accent-soft); }
.artifact.invalid { background: var(--bad-soft); color: var(--bad); }
.artifact.missing { background: var(--warn-soft); color: var(--warn); }
.warnings {
  margin-top: 12px;
  color: var(--warn);
}
.warnings p { margin-bottom: 4px; }
.tabs {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  gap: 6px;
  padding: 12px 0;
  background: var(--bg);
}
.tab, .copy-anchor {
  border: 1px solid var(--line);
  background: var(--panel);
  color: var(--ink);
  border-radius: 6px;
  padding: 8px 11px;
  font: inherit;
  cursor: pointer;
}
.tab.active {
  background: var(--ink);
  border-color: var(--ink);
  color: white;
}
.panel { padding-top: 16px; }
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}
.section-head h2 { margin: 0; font-size: 24px; }
.two-col, .metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}
.metric-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.block, .item, .reference, .count-card { padding: 16px; }
.block { margin-bottom: 14px; }
.block h3, .item h3, .reference h4 { margin-bottom: 8px; }
.reference-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
ul { margin: 8px 0 0; padding-left: 18px; }
code {
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  font-size: 12px;
  background: var(--soft);
  border-radius: 4px;
  padding: 2px 4px;
}
.tag-group { align-items: center; margin-top: 12px; }
.tag-group span, .fine, .empty { color: var(--muted); }
.swatch-grid, .neutral-ramp {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
}
.neutral-ramp { margin-top: 10px; }
.swatch {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr);
  grid-template-areas: "chip role" "chip value" "chip kind";
  gap: 0 10px;
  align-items: center;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 10px;
}
.chip {
  grid-area: chip;
  width: 36px;
  height: 36px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--swatch);
}
.chip.unresolved {
  background: repeating-linear-gradient(45deg, #ddd, #ddd 4px, #fff 4px, #fff 8px);
}
.swatch strong { grid-area: role; }
.swatch code { grid-area: value; width: fit-content; }
.swatch small { grid-area: kind; color: var(--muted); }
.item { margin-bottom: 10px; }
.item-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
.item-head span {
  align-self: start;
  border-radius: 999px;
  background: var(--soft);
  padding: 3px 8px;
  color: var(--muted);
  font-size: 12px;
}
.count-card span { display: block; color: var(--muted); }
.count-card strong { display: block; font-size: 30px; }
.subsection { margin-bottom: 18px; }
.subsection h4 span { color: var(--muted); font-weight: 400; }
.table-wrap {
  width: 100%;
  overflow-x: auto;
  border: 1px solid var(--line);
  border-radius: 8px;
}
table {
  width: 100%;
  border-collapse: collapse;
  min-width: 620px;
}
th, td {
  padding: 9px 10px;
  border-bottom: 1px solid var(--line);
  text-align: left;
  vertical-align: top;
}
th {
  background: var(--soft);
  font-size: 12px;
  color: var(--muted);
}
tr:last-child td { border-bottom: 0; }
.is-hidden-by-search { display: none !important; }
@media (max-width: 860px) {
  .hero, .two-col, .metric-grid, .reference-grid {
    grid-template-columns: 1fr;
  }
  h1 { font-size: 34px; }
  .tabs { overflow-x: auto; }
}
`;
}

function buildJs(): string {
  return `
const tabs = Array.from(document.querySelectorAll("[data-tab]"));
const panels = Array.from(document.querySelectorAll("[data-panel]"));
function showPanel(id) {
  tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === id));
  panels.forEach((panel) => {
    const active = panel.dataset.panel === id;
    panel.hidden = !active;
    panel.classList.toggle("active", active);
  });
  if (location.hash !== "#" + id) history.replaceState(null, "", "#" + id);
}
tabs.forEach((tab) => tab.addEventListener("click", () => showPanel(tab.dataset.tab)));
const initial = location.hash ? location.hash.slice(1) : "overview";
if (tabs.some((tab) => tab.dataset.tab === initial)) showPanel(initial);

const search = document.getElementById("global-search");
search?.addEventListener("input", () => {
  const query = search.value.trim().toLowerCase();
  document.querySelectorAll(".searchable").forEach((node) => {
    const text = node.getAttribute("data-search") || node.textContent.toLowerCase();
    node.classList.toggle("is-hidden-by-search", Boolean(query) && !text.includes(query));
  });
});

document.querySelectorAll("[data-copy-anchor]").forEach((button) => {
  button.addEventListener("click", async () => {
    const anchor = button.getAttribute("data-copy-anchor");
    const url = location.href.split("#")[0] + anchor;
    try {
      await navigator.clipboard.writeText(url);
      button.textContent = "Copied";
      setTimeout(() => { button.textContent = "Copy anchor"; }, 1200);
    } catch {
      location.hash = anchor;
    }
  });
});
`;
}
