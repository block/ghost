import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ARM_ORDER = ["naked", "dump", "gather", "dump-growth"];

const TOKEN_NOTE =
  "Token counts are estimates: words \u00d7 1.33, applied uniformly across arms.";

const HONESTY_LINE =
  "Tell counts, pull tape, screenshots, and CSS extraction are deterministic. Gather loop receipts are agent-attested bookkeeping, not independent proof.";

const GATHER_SCOPE_LINE =
  "The gather arm measures the complete shipped Ghost consumer loop: select, pull, inspect, brief, make, render, repair, and review when available. It is not a context-only causal isolation.";

function esc(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function fmt(n, digits = 2) {
  if (n === null || n === undefined) return "\u2014";
  const value = Number(n);
  if (!Number.isFinite(value)) return "\u2014";
  return value
    .toFixed(digits)
    .replace(/\.00$/, "")
    .replace(/(\.\d)0$/, "$1");
}

function brandTokens(cell) {
  if (Number.isFinite(cell.context?.brandTokens))
    return cell.context.brandTokens;
  const seg = cell.context?.segments ?? {};
  const pulled = cell.retrieval
    ? Math.round((cell.retrieval.pulledWordsMean ?? 0) * 1.33)
    : 0;
  return (seg.brand ?? 0) + (seg.menu ?? 0) + pulled;
}

async function fileExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

// --- headline chart -------------------------------------------------------

function headlineChart(cells) {
  const width = 700;
  const height = 360;
  const m = { top: 30, right: 40, bottom: 50, left: 60 };
  const plotW = width - m.left - m.right;
  const plotH = height - m.top - m.bottom;

  // Aggregate per arm across asks.
  const arms = [];
  for (const arm of ARM_ORDER) {
    const armCells = cells.filter((c) => c.arm === arm);
    if (armCells.length === 0) continue;
    const maxPossible = median(armCells.map((c) => c.scores.max_possible));
    const quality = maxPossible - median(armCells.map((c) => c.scores.median));
    const qMin = maxPossible - Math.max(...armCells.map((c) => c.scores.max));
    const qMax = maxPossible - Math.min(...armCells.map((c) => c.scores.min));
    const tokens = Math.round(median(armCells.map(brandTokens)));
    arms.push({ arm, quality, qMin, qMax, tokens, maxPossible });
  }

  const logX = (t) => Math.log10(Math.max(t, 1));
  const maxLog = Math.max(...arms.map((a) => logX(a.tokens)), 1);
  const xScale = (t) => m.left + (logX(t) / maxLog) * plotW;
  const yMax = Math.max(...arms.map((a) => a.maxPossible));
  const yScale = (q) => m.top + plotH - (q / yMax) * plotH;

  const parts = [];
  parts.push(
    `<svg class="headline" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="Quality versus brand-context tokens">`,
  );
  // Axes
  parts.push(
    `<line x1="${m.left}" y1="${m.top + plotH}" x2="${m.left + plotW}" y2="${m.top + plotH}" stroke="#111827" stroke-width="1"/>`,
    `<line x1="${m.left}" y1="${m.top}" x2="${m.left}" y2="${m.top + plotH}" stroke="#111827" stroke-width="1"/>`,
  );
  // Y gridline labels
  for (let q = 0; q <= yMax; q += Math.max(2, Math.ceil(yMax / 5))) {
    const y = yScale(q);
    parts.push(
      `<text x="${m.left - 8}" y="${y + 4}" text-anchor="end" font-size="11" fill="#6b7280">${q}</text>`,
    );
  }
  // X axis label
  parts.push(
    `<text x="${m.left + plotW / 2}" y="${height - 10}" text-anchor="middle" font-size="12" fill="#111827">brand-context tokens (log scale, estimated: words \u00d7 1.33)</text>`,
    `<text x="16" y="${m.top + plotH / 2}" text-anchor="middle" font-size="12" fill="#111827" transform="rotate(-90 16 ${m.top + plotH / 2})">quality (max \u2212 median tell score)</text>`,
  );
  // Points + whiskers
  for (const a of arms) {
    const x = xScale(a.tokens);
    const yMed = yScale(a.quality);
    const yLo = yScale(a.qMin);
    const yHi = yScale(a.qMax);
    parts.push(
      `<line x1="${x}" y1="${yLo}" x2="${x}" y2="${yHi}" stroke="#111827" stroke-width="1.5"/>`,
      `<line x1="${x - 5}" y1="${yLo}" x2="${x + 5}" y2="${yLo}" stroke="#111827" stroke-width="1.5"/>`,
      `<line x1="${x - 5}" y1="${yHi}" x2="${x + 5}" y2="${yHi}" stroke="#111827" stroke-width="1.5"/>`,
      `<circle cx="${x}" cy="${yMed}" r="5" fill="#111827"/>`,
      `<text x="${x + 10}" y="${yMed - 8}" font-size="12" fill="#111827">${esc(a.arm)}</text>`,
      `<text x="${x + 10}" y="${yMed + 6}" font-size="11" fill="#6b7280">${a.tokens.toLocaleString("en-US")} tokens</text>`,
    );
  }
  parts.push("</svg>");
  return parts.join("\n");
}

// --- per-ask sections -----------------------------------------------------

async function screenshotCell(outDir, cell, k) {
  const rel = join(cell.arm, `ask-${cell.ask}`, `run-${k}.webp`);
  const abs = join(outDir, rel);
  if (await fileExists(abs)) {
    const b64 = (await readFile(abs)).toString("base64");
    const uri = `data:image/webp;base64,${b64}`;
    return `<a href="${uri}" target="_blank"><img class="thumb" src="${uri}" alt="${esc(cell.arm)} ask ${cell.ask} run ${k}"/></a>`;
  }
  return `<div class="thumb placeholder">${esc(cell.arm)}<br/>ask ${cell.ask} \u00b7 run ${k}<br/><span class="dim">no screenshot</span></div>`;
}

async function askSection(outDir, ask, askTitle, cells) {
  const rows = [];
  for (const cell of cells) {
    const thumbs = [];
    for (let k = 1; k <= cell.scores.n; k++) {
      thumbs.push(await screenshotCell(outDir, cell, k));
    }
    rows.push(
      `<div class="grid-row"><div class="grid-label">${esc(cell.arm)}</div>${thumbs.join("")}</div>`,
    );
  }

  const tableRows = cells
    .map((c) => {
      const s = c.scores;
      const con = c.consistency ?? {};
      return `<tr><td>${esc(c.arm)}</td><td>${s.min} / ${s.median} / ${s.max}</td><td>${fmt(con.accentHue)}</td><td>${fmt(con.radius ?? con.controlRadius)}</td><td>${fmt(con.fontStack)}</td><td>${fmt(c.sameness)}</td><td>${(c.context?.tokensEstimate ?? 0).toLocaleString("en-US")}</td></tr>`;
    })
    .join("\n");

  return `<section>
<h2>Ask ${ask} \u2014 ${esc(askTitle)}</h2>
<div class="grid">${rows.join("\n")}</div>
<table>
<thead><tr><th>arm</th><th>tell score min/med/max</th><th>accent-hue consistency</th><th>radius</th><th>font</th><th>sameness</th><th>context tokens</th></tr></thead>
<tbody>${tableRows}</tbody>
</table>
</section>`;
}

// --- gather metrics table -------------------------------------------------

function gatherTable(cells) {
  const gatherCells = cells.filter((c) => c.arm === "gather" && c.retrieval);
  if (gatherCells.length === 0) return "";
  const rows = gatherCells
    .map((c) => {
      const r = c.retrieval;
      const loop = c.loop ?? {};
      const poisonPulls = r.poisonPulls ?? r.poisonCount ?? 0;
      const poison =
        poisonPulls > 0
          ? `<td class="poison">${poisonPulls}</td>`
          : `<td>0</td>`;
      const receipts = Number.isFinite(loop.receipts)
        ? `${loop.receipts}/${loop.runs ?? c.scores?.n ?? "?"}`
        : "\u2014";
      return `<tr><td>${c.ask} \u2014 ${esc(c.askTitle)}</td>${poison}<td>${fmt(r.precision)}</td><td>${fmt(r.recall)}</td><td>${fmt(r.stability ?? r.selectionStability)}</td><td>${(r.pulledWordsMean ?? r.pulledWords ?? 0).toLocaleString("en-US")}</td><td>${receipts}</td><td>${fmt(loop.meanRepairPasses)}</td><td>${Number.isFinite(loop.renderedCount) ? loop.renderedCount : "\u2014"}</td><td>${Number.isFinite(loop.reviewRanCount) ? loop.reviewRanCount : "\u2014"}</td></tr>`;
    })
    .join("\n");
  return `<section>
<h2>Gather metrics</h2>
<p class="dim">From deterministic selection tape plus agent-attested loop receipts. Poison pulls \u2014 wrong-register nodes pulled for the ask \u2014 are the legible retrieval number; receipt fields summarize process and verification claims from <code>run-k.loop.json</code>.</p>
<table>
<thead><tr><th>ask</th><th>poison pulls</th><th>precision</th><th>recall</th><th>stability</th><th>pulled words (mean)</th><th>receipts</th><th>mean repairs</th><th>rendered</th><th>review ran</th></tr></thead>
<tbody>${rows}</tbody>
</table>
</section>`;
}

// --- main -----------------------------------------------------------------

export async function renderReport(metricsJsonPath, outDir) {
  const metrics = JSON.parse(await readFile(metricsJsonPath, "utf8"));
  const cells = metrics.cells ?? [];

  const byAsk = new Map();
  for (const cell of cells) {
    if (!byAsk.has(cell.ask)) byAsk.set(cell.ask, []);
    byAsk.get(cell.ask).push(cell);
  }
  for (const list of byAsk.values()) {
    list.sort((a, b) => ARM_ORDER.indexOf(a.arm) - ARM_ORDER.indexOf(b.arm));
  }

  const askSections = [];
  for (const [ask, list] of [...byAsk.entries()].sort((a, b) => a[0] - b[0])) {
    askSections.push(await askSection(outDir, ask, list[0].askTitle, list));
  }

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>steering-control report</title>
<style>
:root { color-scheme: light; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #111827; background: #ffffff; margin: 0; padding: 2rem; line-height: 1.5; max-width: 72rem; }
h1 { font-size: 1.5rem; margin: 0 0 0.25rem; }
h2 { font-size: 1.125rem; margin: 2.5rem 0 0.75rem; border-top: 1px solid #e5e7eb; padding-top: 1.5rem; }
p { margin: 0.25rem 0; }
.dim { color: #6b7280; font-size: 0.875rem; }
.honesty { margin: 0.75rem 0 1.5rem; font-size: 0.9375rem; }
table { border-collapse: collapse; margin: 0.75rem 0; font-size: 0.875rem; font-variant-numeric: tabular-nums; }
th, td { border: 1px solid #e5e7eb; padding: 0.375rem 0.75rem; text-align: left; }
th { background: #f9fafb; font-weight: 600; }
td.poison { color: #b91c1c; font-weight: 700; }
.grid { display: flex; flex-direction: column; gap: 0.5rem; margin: 0.75rem 0; }
.grid-row { display: flex; gap: 0.5rem; align-items: flex-start; }
.grid-label { width: 6.5rem; flex: none; font-size: 0.8125rem; padding-top: 0.25rem; }
.thumb { width: 220px; border: 1px solid #e5e7eb; display: block; }
.thumb.placeholder { height: 140px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #f9fafb; color: #111827; font-size: 0.75rem; text-align: center; }
.headline { display: block; margin: 1rem 0; }
code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.8125rem; background: #f9fafb; padding: 0.125rem 0.25rem; }
footer { margin-top: 3rem; border-top: 1px solid #e5e7eb; padding-top: 1.5rem; font-size: 0.875rem; }
</style>
</head>
<body>
<header>
<h1>steering-control report</h1>
<p class="dim">generated: ${esc(metrics.generatedAt ?? "unknown")}</p>
<p class="dim">package: ${esc(metrics.config?.package ?? "unknown")} \u00b7 runs per cell: ${metrics.config?.runsPerCell ?? "?"}</p>
<p class="honesty">${HONESTY_LINE}</p>
<p class="honesty">${GATHER_SCOPE_LINE}</p>
</header>
<section>
<h2>Quality vs. brand-context tokens</h2>
<p class="dim">One point per arm (median of per-ask medians); whisker = min\u2013max band across all runs. Y is inverted median tell score, so higher is better.</p>
${headlineChart(cells)}
</section>
${askSections.join("\n")}
${gatherTable(cells)}
<footer>
<p>Rebuild this report from <code>out/</code> alone:</p>
<p><code>steering-control shoot</code> \u00b7 <code>steering-control score</code> \u00b7 <code>steering-control report</code></p>
<p class="dim">${TOKEN_NOTE}</p>
</footer>
</body>
</html>
`;

  await mkdir(outDir, { recursive: true });
  const reportPath = join(outDir, "report.html");
  await writeFile(reportPath, html, "utf8");
  return reportPath;
}
