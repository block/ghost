#!/usr/bin/env node
// Survey-recipe extraction script for packages/ghost-ui.
// Enumerates exhaustively: tokens from main.css, components from registry.json,
// libraries from package.json, values from frequency-clustered hex/scalar/etc.
// Writes a bucket.json with empty IDs (fix-ids will populate).

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = "/Users/nahiyan/Development/ghost/packages/ghost-ui";
const SOURCE = {
  target: "github:block/ghost#packages/ghost-ui",
  commit: execSync("git rev-parse HEAD", {
    cwd: "/Users/nahiyan/Development/ghost",
  })
    .toString()
    .trim(),
  scanned_at: "2026-04-29T16:10:00Z",
  scanner_version: "0.1.0",
};

// ---- 1. Tokens — every named CSS custom property in main.css ----

const mainCss = readFileSync(resolve(ROOT, "src/styles/main.css"), "utf-8");

// Walk main.css line-by-line. Each `--name: value;` is a declaration.
// We dedupe by name, prefer the :root / @theme declaration as the canonical
// source, and capture per-theme overrides under by_theme.
const tokens = new Map(); // name -> { name, declarations: { theme -> value } }
let currentScope = "theme"; // "theme" | "root" | "dark"
const lines = mainCss.split("\n");
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  // Update scope on block boundaries.
  if (/^\s*@theme\s*\{/.test(line)) currentScope = "theme";
  else if (/^\s*@theme\s+inline\s*\{/.test(line)) currentScope = "theme-inline";
  else if (/^\s*:root\s*\{/.test(line)) currentScope = "root";
  else if (/^\s*\.dark\s*\{/.test(line)) currentScope = "dark";
  else if (/^\s*@layer\s+/.test(line)) currentScope = "layer";

  // Match a custom property declaration.
  const m = line.match(/^\s*(--[a-z0-9-]+)\s*:\s*([^;]+?)\s*;\s*$/i);
  if (!m) continue;
  const [, name, value] = m;

  if (!tokens.has(name)) {
    tokens.set(name, { name, scopes: {} });
  }
  const t = tokens.get(name);
  if (!t.scopes[currentScope]) t.scopes[currentScope] = value;
}

// Build token rows. Resolve simple alias chains by following var() refs.
function resolveChain(name, byScope, depth = 0) {
  if (depth > 10)
    return { chain: [], resolved: byScope[name]?.scopes?.root ?? "" };
  const scoped =
    byScope[name]?.scopes?.root ??
    byScope[name]?.scopes?.theme ??
    byScope[name]?.scopes?.["theme-inline"] ??
    "";
  const m = scoped.match(/^var\(\s*(--[a-z0-9-]+)/i);
  if (!m) return { chain: [], resolved: scoped };
  const next = m[1];
  const sub = resolveChain(next, byScope, depth + 1);
  return { chain: [next, ...sub.chain], resolved: sub.resolved };
}

const byName = Object.fromEntries(tokens);
const tokenRows = [];
for (const t of tokens.values()) {
  const { chain, resolved } = resolveChain(t.name, byName);
  const row = {
    id: "",
    source: SOURCE,
    name: t.name,
    alias_chain: chain,
    resolved_value: resolved,
    occurrences: 1,
  };
  // by_theme: capture light vs dark divergence when both scopes have a declaration.
  const root = t.scopes.root;
  const dark = t.scopes.dark;
  if (root && dark && root !== dark) {
    row.by_theme = { light: root, dark };
  }
  tokenRows.push(row);
}
console.error(`tokens: ${tokenRows.length}`);

// ---- 2. Components — every registry:ui item ----

const registry = JSON.parse(
  readFileSync(resolve(ROOT, "registry.json"), "utf-8"),
);
const componentRows = registry.items
  .filter((i) => i.type === "registry:ui")
  .map((i) => ({
    id: "",
    source: SOURCE,
    name: i.name,
    discovered_via: "registry.json",
  }));
console.error(`components: ${componentRows.length}`);

// ---- 3. Libraries — every external dep that contributes design surface ----

const pkg = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf-8"));
const deps = pkg.dependencies || {};
const LIBRARY_KIND = (name) => {
  if (name.startsWith("@radix-ui/react-")) return "primitives";
  if (name === "lucide-react") return "icons";
  if (name === "recharts") return "charts";
  if (name === "tw-animate-css") return "animation";
  if (name === "motion" || name === "framer-motion") return "motion";
  if (name === "@hookform/resolvers" || name === "react-hook-form")
    return "forms";
  if (name === "zod") return "validation";
  if (name === "date-fns" || name === "react-day-picker") return "date";
  if (name === "cmdk") return "command-palette";
  if (name === "sonner") return "toast";
  if (name === "vaul") return "drawer";
  if (name === "class-variance-authority") return "variant-helper";
  if (name === "clsx" || name === "tailwind-merge") return "class-utils";
  return null;
};
const libraryRows = [];
for (const [name, version] of Object.entries(deps)) {
  const kind = LIBRARY_KIND(name);
  if (!kind) continue;
  libraryRows.push({
    id: "",
    source: SOURCE,
    name,
    kind,
    version,
  });
}
console.error(`libraries: ${libraryRows.length}`);

// ---- 4. Values — frequency-clustered literals across the design system ----

function rgFreq(pattern, glob) {
  try {
    const out = execSync(
      `rg -oNI '${pattern}' -g '${glob}' src/ 2>/dev/null | sort | uniq -c | sort -rn`,
      { cwd: ROOT, encoding: "utf-8" },
    );
    return out
      .split("\n")
      .filter(Boolean)
      .map((l) => {
        const m = l.match(/^\s*(\d+)\s+(.+)$/);
        return m ? { count: Number(m[1]), value: m[2] } : null;
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function rgFilesContaining(pattern, glob) {
  try {
    const out = execSync(`rg -lN '${pattern}' -g '${glob}' src/ 2>/dev/null`, {
      cwd: ROOT,
      encoding: "utf-8",
    });
    return out.split("\n").filter(Boolean).length;
  } catch {
    return 0;
  }
}

const valueRows = [];

// Hex colors
const hexes = rgFreq("#[0-9a-fA-F]{6}", "*.{ts,tsx,css}");
for (const { count, value } of hexes) {
  if (count < 1) continue;
  valueRows.push({
    id: "",
    source: SOURCE,
    kind: "color",
    value: value.toLowerCase(),
    raw: value,
    spec: { space: "srgb", hex: value.toLowerCase() },
    occurrences: count,
    files_count: rgFilesContaining(value, "*.{ts,tsx,css}"),
  });
}

// px scalars (split into spacing / radius / breakpoint / shadow-blur / layout-primitive)
const pxScalars = rgFreq("\\b[0-9]+(\\.[0-9]+)?px\\b", "*.{css}");
for (const { count, value } of pxScalars) {
  const num = parseFloat(value);
  // Heuristic kind by value range — agent's role-hypothesis guess
  let kind = "spacing";
  if (num === 999 || num === 1440) {
    kind = num === 1440 ? "breakpoint" : "radius";
  } else if (num >= 1000) {
    kind = "layout-primitive";
  }
  valueRows.push({
    id: "",
    source: SOURCE,
    kind,
    value: String(num),
    raw: value,
    spec:
      kind === "breakpoint"
        ? {
            scalar: num,
            unit: "px",
            label: num === 1440 ? "desktop" : undefined,
          }
        : { scalar: num, unit: "px" },
    occurrences: count,
    files_count: rgFilesContaining(value, "*.{css}"),
  });
}

// rem scalars
const remScalars = rgFreq("\\b[0-9]+(\\.[0-9]+)?rem\\b", "*.{ts,tsx,css}");
for (const { count, value } of remScalars) {
  valueRows.push({
    id: "",
    source: SOURCE,
    kind: "spacing",
    value,
    raw: value,
    spec: { scalar: parseFloat(value), unit: "rem" },
    occurrences: count,
    files_count: rgFilesContaining(value, "*.{ts,tsx,css}"),
  });
}

// motion durations
const durations = rgFreq("\\b[0-9]+(\\.[0-9]+)?s\\b", "*.{css}");
for (const { count, value } of durations) {
  // Skip values likely not durations (e.g. 999s would be junk; capping)
  const seconds = parseFloat(value);
  if (seconds > 5) continue;
  valueRows.push({
    id: "",
    source: SOURCE,
    kind: "motion",
    value,
    raw: value,
    spec: { duration_ms: Math.round(seconds * 1000) },
    occurrences: count,
    files_count: rgFilesContaining(value, "*.{css}"),
  });
}

// font-family declarations (string literals in @theme + @theme inline)
const families = new Set();
const fontMatches = mainCss.match(/--font-[a-z-]+:\s*([^;]+);/gi) || [];
for (const m of fontMatches) {
  const valueMatch = m.match(/--font-[a-z-]+:\s*([^;]+);/i);
  if (!valueMatch) continue;
  // Pull primary family name (first comma-separated entry, dequoted)
  const primary = valueMatch[1]
    .split(",")[0]
    .trim()
    .replace(/^["']|["']$/g, "");
  if (primary && primary !== "var") families.add(primary);
}
for (const family of families) {
  valueRows.push({
    id: "",
    source: SOURCE,
    kind: "typography",
    value: family,
    raw: `"${family}"`,
    spec: { family },
    occurrences: 1,
    files_count: 1,
  });
}

// easing
const easings = mainCss.match(/cubic-bezier\([^)]+\)/g) || [];
for (const easing of new Set(easings)) {
  valueRows.push({
    id: "",
    source: SOURCE,
    kind: "motion",
    value: easing,
    raw: easing,
    spec: { easing },
    occurrences: 1,
    files_count: 1,
  });
}

console.error(`values: ${valueRows.length}`);

// ---- 5. Write ----

const bucket = {
  schema: "ghost.bucket/v1",
  sources: [SOURCE],
  values: valueRows,
  tokens: tokenRows,
  components: componentRows,
  libraries: libraryRows,
};

writeFileSync(
  "/tmp/ghost-ui-scan/bucket.json",
  JSON.stringify(bucket, null, 2) + "\n",
);
console.error(
  `\nbucket totals: values=${valueRows.length} tokens=${tokenRows.length} components=${componentRows.length} libraries=${libraryRows.length}`,
);
