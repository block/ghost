import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseAsks } from "./asks.mjs";
import { cellSameness } from "./sameness.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const defaultTellsPath = join(here, "..", "default-tells.json");

export function scoreHtml(html, tells, { discountTells = [] } = {}) {
  const discounts = new Set(discountTells);
  const hits = [];
  let score = 0;
  let max = 0;
  for (const tell of tells) {
    if (discounts.has(tell.id)) continue;
    max += tell.weight;
    const count = countTell(html, tell);
    if (count > 0) {
      hits.push({ id: tell.id, count });
      score += tell.weight;
    }
  }
  return { score, max, hits };
}

export function scoreAll(config) {
  const tells = JSON.parse(
    readFileSync(config.tells ?? defaultTellsPath, "utf8"),
  ).tells;
  const asks = parseAsks(readFileSync(config.asks, "utf8"));
  const cells = [];
  for (const arm of enabledArms(config)) {
    for (const ask of asksForArm(config, arm, asks)) {
      const dir = join(config.out, arm, `ask-${ask.n}`);
      const htmlFiles = existingRunFiles(dir, ".html");
      if (htmlFiles.length === 0) continue;
      const htmls = htmlFiles.map((file) =>
        readFileSync(join(dir, file), "utf8"),
      );
      const scoredRuns = htmls.map((html) =>
        scoreHtml(html, tells, { discountTells: ask.discount }),
      );
      const runScores = scoredRuns.map((run) => run.score);
      const metas = existingRunFiles(dir, ".meta.json").map((file) =>
        JSON.parse(readFileSync(join(dir, file), "utf8")),
      );
      const cell = {
        arm,
        ask: ask.n,
        askTitle: ask.title,
        scores: {
          ...summarize(runScores),
          max_possible: scoredRuns[0]?.max ?? 0,
        },
        consistency: styleConsistency(htmls),
        sameness: cellSameness(htmls).mean,
        context: {
          tokensEstimate: mean(
            metas
              .map((meta) => meta.inventory?.tokensEstimate)
              .filter(Number.isFinite),
          ),
          segments: segmentMeans(metas),
          brandTokens: mean(metas.map((meta) => brandTokens(config, meta))),
        },
      };
      if (arm === "gather") {
        cell.retrieval = retrievalMetrics(metas, ask, config);
        cell.loop = loopMetrics(metas);
        warnOnMixedLoopProtocols(ask, metas, cell.loop);
      }
      cells.push(cell);
    }
  }
  const metrics = {
    generatedAt: new Date().toISOString(),
    config: { runsPerCell: config.runsPerCell, package: config.package },
    cells,
  };
  writeFileSync(
    join(config.out, "metrics.json"),
    JSON.stringify(metrics, null, 2),
    "utf8",
  );
  return metrics;
}

export function retrievalMetrics(metas, ask, config) {
  const expected = new Set(ask.expect ?? []);
  const poison = new Set(ask.poison ?? []);
  const runs = metas.map((meta) => new Set(meta.tape?.pulledIds ?? []));
  const perRun = runs.map((pulled) => {
    const relevant = intersectionSize(pulled, expected);
    return {
      precision:
        pulled.size > 0 ? relevant / pulled.size : expected.size === 0 ? 1 : 0,
      recall: expected.size > 0 ? relevant / expected.size : 1,
      poisonPulled: [...poison].some((id) => pulled.has(id)),
    };
  });
  const poisonCount = perRun.filter((run) => run.poisonPulled).length;
  const pulledWords = config
    ? mean(
        metas.map((meta) =>
          (meta.tape?.pulledIds ?? []).reduce((sum, id) => {
            const nodePath = join(config.package, `${id}.md`);
            if (!existsSync(nodePath)) return sum;
            return (
              sum + (readFileSync(nodePath, "utf8").match(/\S+/gu) ?? []).length
            );
          }, 0),
        ),
      )
    : 0;
  return {
    precision: mean(perRun.map((run) => run.precision)),
    recall: mean(perRun.map((run) => run.recall)),
    poisonPulled: perRun.map((run) => run.poisonPulled),
    poisonCount,
    poisonPulls: poisonCount,
    poisonRuns: poisonCount,
    selectionStability: meanPairwiseJaccard(runs),
    stability: meanPairwiseJaccard(runs),
    pulledWords,
    pulledWordsMean: pulledWords,
  };
}

export function loopMetrics(metas) {
  const runs = metas.length;
  const validReceipts = metas.map((meta) => meta.loop).filter(validLoopReceipt);
  return {
    receipts: validReceipts.length,
    runs,
    meanRepairPasses:
      validReceipts.length > 0
        ? mean(validReceipts.map((loop) => loop.repairPasses))
        : null,
    renderedCount: validReceipts.filter((loop) => loop.rendered === true)
      .length,
    reviewRanCount: validReceipts.filter((loop) => loop.reviewRan === true)
      .length,
  };
}

function warnOnMixedLoopProtocols(ask, metas, loop) {
  if (loop.receipts === 0 || loop.receipts === metas.length) return;
  console.warn(
    `steering-control: gather ask ${ask.n} mixes runs with and without valid loop receipts; this mixes protocols and should not be compared as one distribution.`,
  );
}

function validLoopReceipt(loop) {
  return (
    loop &&
    typeof loop === "object" &&
    !Array.isArray(loop) &&
    Array.isArray(loop.pulledIds) &&
    Array.isArray(loop.inspectedMaterials) &&
    typeof loop.rendered === "boolean" &&
    Number.isFinite(loop.repairPasses) &&
    loop.repairPasses >= 0 &&
    typeof loop.reviewRan === "boolean"
  );
}

function brandTokens(config, meta) {
  const inv = meta.inventory ?? {};
  const brandWords = inv.brand ?? 0;
  const menuWords = inv.menu ?? 0;
  const pulledWords = (meta.tape?.pulledIds ?? []).reduce((sum, id) => {
    const nodePath = join(config.package, `${id}.md`);
    if (!existsSync(nodePath)) return sum;
    return sum + (readFileSync(nodePath, "utf8").match(/\S+/gu) ?? []).length;
  }, 0);
  return Math.round((brandWords + menuWords + pulledWords) * 1.33);
}

function segmentMeans(metas) {
  const keys = ["ballast", "brand", "menu", "instructions", "ask"];
  return Object.fromEntries(
    keys.map((key) => [
      key,
      mean(metas.map((meta) => meta.inventory?.[key]).filter(Number.isFinite)),
    ]),
  );
}

function countTell(html, tell) {
  if (tell.kind === "text")
    return tell.pattern ? html.split(tell.pattern).length - 1 : 0;
  return [...html.matchAll(new RegExp(tell.pattern, "giu"))].length;
}

function enabledArms(config) {
  return Object.entries(config.arms)
    .filter(([, value]) => value)
    .map(([arm]) => arm);
}
function asksForArm(config, arm, asks) {
  const allowed = config.arms[arm]?.asks;
  return Array.isArray(allowed)
    ? asks.filter((ask) => allowed.includes(ask.n))
    : asks;
}
function existingRunFiles(dir, suffix) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((file) => /^run-\d+/u.test(file) && file.endsWith(suffix))
    .sort();
}
function summarize(values) {
  if (values.length === 0) return { min: 0, median: 0, max: 0, mean: 0, n: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  return {
    min: sorted[0],
    median: median(sorted),
    max: sorted.at(-1),
    mean: mean(sorted),
    n: sorted.length,
  };
}
function median(sorted) {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
function mean(values) {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
}
function intersectionSize(a, b) {
  let n = 0;
  for (const value of a) if (b.has(value)) n += 1;
  return n;
}
function meanPairwiseJaccard(sets) {
  if (sets.length < 2) return sets.length === 1 ? 1 : 0;
  const scores = [];
  for (let i = 0; i < sets.length; i += 1) {
    for (let j = i + 1; j < sets.length; j += 1) {
      const union = new Set([...sets[i], ...sets[j]]);
      scores.push(
        union.size ? intersectionSize(sets[i], sets[j]) / union.size : 1,
      );
    }
  }
  return mean(scores);
}

function styleConsistency(htmls) {
  const dimensions = {
    accentHue: htmls.map(dominantHue),
    controlRadius: htmls.map((html) =>
      radiusFor(
        html,
        /(button|input|select|textarea|\.btn|\.button)[^{]*\{[^}]*\}/giu,
      ),
    ),
    cardRadius: htmls.map((html) =>
      radiusFor(html, /(card|panel|surface|modal)[^{]*\{[^}]*\}/giu),
    ),
    fontStack: htmls.map(firstFontStack),
  };
  return Object.fromEntries(
    Object.entries(dimensions).map(([key, values]) => [
      key,
      modalFraction(values.filter(Boolean)),
    ]),
  );
}
function modalFraction(values) {
  if (values.length === 0) return 0;
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return Math.max(...counts.values()) / values.length;
}
function firstFontStack(html) {
  return (
    html
      .match(/font-family\s*:\s*([^;}]+)/iu)?.[1]
      .trim()
      .toLowerCase() ?? null
  );
}
function radiusFor(html, selectorRegex) {
  for (const block of html.matchAll(selectorRegex)) {
    const radius = block[0]
      .match(/border-radius\s*:\s*([^;}]+)/iu)?.[1]
      .trim()
      .toLowerCase();
    if (radius) return radius;
  }
  return null;
}
function dominantHue(html) {
  const hues = [];
  for (const color of extractColors(html)) {
    const hsl = toHsl(color);
    if (hsl && hsl.s >= 8) hues.push((Math.round(hsl.h / 30) * 30) % 360);
  }
  if (hues.length === 0) return null;
  const counts = new Map();
  for (const hue of hues) counts.set(hue, (counts.get(hue) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0];
}
function extractColors(html) {
  return [
    ...(html.match(/#[0-9a-f]{3,8}\b/giu) ?? []),
    ...(html.match(/rgba?\([^)]*\)/giu) ?? []),
    ...(html.match(/hsla?\([^)]*\)/giu) ?? []),
  ];
}
function toHsl(color) {
  if (color.startsWith("#")) return rgbToHsl(...hexToRgb(color));
  const nums = color.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (color.startsWith("rgb")) return rgbToHsl(nums[0], nums[1], nums[2]);
  if (color.startsWith("hsl"))
    return {
      h: ((nums[0] % 360) + 360) % 360,
      s: nums[1] ?? 0,
      l: nums[2] ?? 0,
    };
  return null;
}
function hexToRgb(hex) {
  let value = hex.slice(1);
  if (value.length === 3 || value.length === 4)
    value = value
      .split("")
      .map((c) => c + c)
      .join("");
  const n = Number.parseInt(value.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  return { h: (h + 360) % 360, s: s * 100, l: l * 100 };
}
