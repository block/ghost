#!/usr/bin/env node
// Median score: count measured unsteered-generation tells in an HTML artifact.
// Grounded in the antimedian experiment (300 generations, 3 models, no design
// context). Higher score = more median. Usage:
//   node median-score.mjs <file.html> [more.html…]
//   node median-score.mjs out/A/*/*.html
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const { tells } = JSON.parse(
  readFileSync(join(here, "median-tells.json"), "utf8"),
);

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

function countTell(html, tell) {
  if (tell.kind === "text") {
    if (!tell.pattern) return 0;
    return html.split(tell.pattern).length - 1;
  }

  const regex = new RegExp(tell.pattern, "giu");
  let count = 0;
  for (const _match of html.matchAll(regex)) count += 1;
  return count;
}

const isScript = process.argv[1] === fileURLToPath(import.meta.url);

if (isScript) {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error("usage: median-score.mjs <file.html> [...]");
    process.exit(1);
  }

  const rows = [];
  for (const file of files) {
    const html = readFileSync(file, "utf8");
    const { score, hits } = scoreHtml(html, tells);
    rows.push({ file, score, hits: hits.map((hit) => hit.id) });
  }

  const max = tells.reduce((s, t) => s + t.weight, 0);
  for (const { file, score, hits } of rows.sort((a, b) => b.score - a.score)) {
    console.log(`${String(score).padStart(3)}/${max}  ${file}`);
    for (const h of hits) console.log(`         - ${h}`);
  }
  if (rows.length > 1) {
    const mean = rows.reduce((s, r) => s + r.score, 0) / rows.length;
    console.log(
      `\nmean: ${mean.toFixed(1)}/${max} across ${rows.length} files`,
    );
  }
}
