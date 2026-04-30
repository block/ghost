#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const TARGET_ROOT = "/Users/nahiyan/Development/square-web/apps/managerbot";
const UI_ROOT = `${TARGET_ROOT}/libs/managerbot-ui`;
const THEME_CSS = `${UI_ROOT}/src/styles/theme.css`;
const GLOBALS_CSS = `${UI_ROOT}/src/styles/globals.css`;
const COMPONENTS_DIR = `${UI_ROOT}/src/components`;

const SOURCE = {
  target: "squareup/square-web/apps/managerbot",
  scanned_at: "2026-04-30T00:00:00Z",
};

const themeRaw = readFileSync(THEME_CSS, "utf8");
const globalsRaw = readFileSync(GLOBALS_CSS, "utf8");

// Walk the file linearly, tracking current selector/at-rule context.
// We only need three contexts: :root, .dark, @theme inline.
function parseDecls(css) {
  const lines = css.split("\n");
  const stack = [];
  const decls = []; // { context, name, value, line }
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();
    if (trimmed.endsWith("{")) {
      const head = trimmed.replace(/\s*\{$/, "").trim();
      stack.push(head);
      continue;
    }
    if (trimmed === "}") {
      stack.pop();
      continue;
    }
    const m = raw.match(/^\s*(--[a-zA-Z0-9_-]+)\s*:\s*(.+?);?\s*$/);
    if (m) {
      const ctx = stack[stack.length - 1] || "";
      decls.push({
        context: ctx,
        name: m[1],
        value: m[2].replace(/;$/, "").trim(),
        line: i + 1,
      });
    }
  }
  return decls;
}

const themeDecls = parseDecls(themeRaw);
// Filter out the @theme inline `--color-*` re-exports (mechanical Tailwind 4
// alias layer for class atom generation; not part of the canonical token set).
function isMechanicalReExport(d) {
  // @theme inline block holds reexports prefixed with --color-, plus radius / shadow / text / etc.
  // We keep radius, shadow, text, font, animate, etc. — those are canonical.
  // We drop --color-<name> if its value is exactly var(--<name>).
  if (!d.context.startsWith("@theme")) return false;
  if (!d.name.startsWith("--color-")) return false;
  const stripped = d.name.replace(/^--color-/, "");
  return d.value === `var(--${stripped})`;
}

const canonical = themeDecls.filter((d) => !isMechanicalReExport(d));

// Group by name → resolve aliases / by_theme.
// :root + @theme are the "default" theme; .dark and @utility .force-light add variants.
const byName = new Map();
for (const d of canonical) {
  const slot = byName.get(d.name) || {
    name: d.name,
    default: null,
    variants: {},
  };
  if (d.context === ":root" || d.context.startsWith("@theme")) {
    if (!slot.default) slot.default = d;
  } else if (d.context === ".dark") {
    slot.variants.dark = d;
  } else if (d.context.includes("force-light")) {
    slot.variants.forceLight = d;
  } else {
    // unknown — record under context name
    slot.variants[d.context] = d;
  }
  byName.set(d.name, slot);
}

// Resolve var() chains within :root scope to literal where possible.
function resolveLiteral(value, scope) {
  // scope: Map<name, literal> — recursion-safe via depth limit
  const seen = new Set();
  let cur = value;
  for (let depth = 0; depth < 8; depth++) {
    const m = cur.match(/^var\((--[a-zA-Z0-9_-]+)\)$/);
    if (!m) return cur;
    if (seen.has(m[1])) return cur;
    seen.add(m[1]);
    const next = scope.get(m[1]);
    if (!next) return cur;
    cur = next;
  }
  return cur;
}

const rootScope = new Map();
for (const [name, slot] of byName) {
  if (slot.default) rootScope.set(name, slot.default.value);
}

// kind classifier
function classify(name, value) {
  if (name.startsWith("--shadow-")) return "shadow";
  if (name.startsWith("--radius-")) return "radius";
  if (name.startsWith("--text-")) return "typography";
  if (name === "--font-sans") return "typography";
  if (
    name.startsWith("--width-") ||
    name === "--page-x-padding" ||
    name.startsWith("--core-icon-")
  )
    return "spacing";
  if (name === "--border-width-hairline") return "spacing";
  if (name.startsWith("--animate-")) return "motion";
  // colors: anything that resolves to oklch(...) or oklab(...) or rgba(...) or # or var-of-color
  if (/oklch|oklab|rgba?|hsla?|^#[0-9a-fA-F]/i.test(value)) return "color";
  // semantic color names
  if (
    /^--(background|foreground|card|popover|primary|secondary|muted|subtle|accent|destructive|danger|success|warning|trend|border|input|ring|sidebar|panel|elevation|chart|popover-border|color-mix)/.test(
      name,
    )
  )
    return "color";
  // ramp-named tokens default to color
  if (
    /^--(black|white|neutral|red|yellow|green|blue|purple|cashapp|square|slate|gray|zinc|stone|rose|orange|amber|lime|emerald|teal|cyan|sky|indigo|violet|fuchsia|pink)/.test(
      name,
    )
  )
    return "color";
  return "unknown";
}

// Compute occurrences of each TOKEN NAME across the UI surface.
// We do this by reading every .tsx/.ts/.css file under src/.
function walk(dir, out) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === "node_modules" || e.name === "dist") continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (/\.(tsx?|css|jsx?|mdx?)$/.test(e.name)) out.push(full);
  }
  return out;
}

const allFiles = walk(`${UI_ROOT}/src`, []);
const fileTexts = new Map();
for (const f of allFiles) {
  try {
    fileTexts.set(f, readFileSync(f, "utf8"));
  } catch {}
}

function countOccurrences(needle) {
  let occ = 0;
  let files = 0;
  for (const [, txt] of fileTexts) {
    let m = 0;
    let idx = 0;
    while ((idx = txt.indexOf(needle, idx)) !== -1) {
      m++;
      idx += needle.length;
    }
    if (m > 0) {
      occ += m;
      files++;
    }
  }
  return { occ, files };
}

// Build tokens[]
const tokens = [];
for (const [name, slot] of byName) {
  const def = slot.default;
  if (!def) continue;
  const kind = classify(name, def.value);
  const aliasMatch = def.value.match(/^var\((--[a-zA-Z0-9_-]+)\)$/);
  const alias_chain = aliasMatch ? [name, aliasMatch[1]] : [];
  const resolved = resolveLiteral(def.value, rootScope);

  // Tailwind utility users reference tokens via class atoms (e.g. `bg-primary`,
  // `text-neutral-500`). Counting `--token` matches CSS-var references only,
  // which undercounts for the @theme inline tokens — but it's the most reliable
  // cross-codebase signal we can produce without a full Tailwind pass.
  const { occ, files } = countOccurrences(name);

  const row = {
    id: "",
    source: SOURCE,
    name,
    alias_chain,
    resolved_value: resolved,
    occurrences: occ,
    files_count: files,
    kind,
  };

  // by_theme — only for tokens with .dark variant
  const variants = {};
  if (slot.variants.dark) variants.dark = slot.variants.dark.value;
  if (slot.variants.forceLight)
    variants.force_light = slot.variants.forceLight.value;
  if (Object.keys(variants).length) {
    row.by_theme = { default: def.value, ...variants };
  }
  tokens.push(row);
}

// Build values[] from distinct literal values observed in the design system.
// Each row should be a concrete literal that ships.
// Strategy: for each token whose resolved_value is a literal (oklch/rgba/px/rem/...),
// register one value row keyed by the literal, accumulating occurrences across tokens
// that share that literal.
const valueAcc = new Map(); // key: kind|literal → row

function addValue(kind, literal, source_token, occ, files) {
  const key = `${kind}|${literal}`;
  if (!valueAcc.has(key)) {
    valueAcc.set(key, {
      id: "",
      source: SOURCE,
      kind,
      value: literal,
      raw: literal,
      spec: deriveSpec(kind, literal),
      occurrences: 0,
      files_count: 0,
      tokens: [],
    });
  }
  const row = valueAcc.get(key);
  row.occurrences += occ;
  row.files_count = Math.max(row.files_count, files);
  row.tokens.push(source_token);
}

function deriveSpec(kind, lit) {
  if (kind === "color") {
    if (lit.startsWith("oklch")) return { space: "oklch", source: lit };
    if (lit.startsWith("oklab")) return { space: "oklab", source: lit };
    if (lit.startsWith("rgba") || lit.startsWith("rgb"))
      return { space: "srgb", source: lit };
    if (lit.startsWith("#")) return { space: "srgb", hex: lit };
    return { source: lit };
  }
  if (kind === "radius" || kind === "spacing") {
    const m = lit.match(/^([0-9.]+)(px|rem|em|%|vh|vw)$/);
    if (m) return { unit: m[2], magnitude: Number(m[1]) };
    return { source: lit };
  }
  if (kind === "typography") {
    const m = lit.match(/^([0-9.]+)(px|rem|em)$/);
    if (m) return { unit: m[2], magnitude: Number(m[1]) };
    return { source: lit };
  }
  if (kind === "shadow") return { source: lit };
  return { source: lit };
}

for (const t of tokens) {
  const lit = t.resolved_value;
  if (lit.startsWith("var(")) continue; // unresolved alias — skip; the chain captures it
  if (t.kind === "unknown") continue;
  addValue(t.kind, lit, t.name, t.occurrences || 1, t.files_count || 1);
}

// Add breakpoint values from globals.css and theme.css (basic regex on @media).
const bpHits = [
  ...themeRaw.matchAll(/@media \(min-width:\s*(\d+)px\)/g),
  ...globalsRaw.matchAll(/@media \(min-width:\s*(\d+)px\)/g),
];
const bpSet = new Set();
for (const m of bpHits) bpSet.add(`${m[1]}px`);
for (const px of bpSet) {
  const key = `breakpoint|${px}`;
  valueAcc.set(key, {
    id: "",
    source: SOURCE,
    kind: "breakpoint",
    value: px,
    raw: px,
    spec: { unit: "px", magnitude: Number(px.replace("px", "")) },
    occurrences: 1,
    files_count: 1,
  });
}

const values = Array.from(valueAcc.values());

// Build components[] from filesystem.
// Recurse into design_system paths but exclude visx-charts and rjsf per ui_surface.
function pascal(name) {
  return name
    .replace(/\.(tsx|ts)$/, "")
    .replace(/(^|[-_/])([a-z])/g, (_, __, c) => c.toUpperCase());
}

const compFiles = [];
function collectComponents(dir, prefix = "") {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (
      e.name === "visx-charts" ||
      e.name === "rjsf" ||
      e.name === "icon-map.tsx" ||
      e.name === "icons.tsx" ||
      e.name === "icons.stories.tsx"
    )
      continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      collectComponents(full, prefix ? `${prefix}/${e.name}` : e.name);
    } else if (
      /\.tsx$/.test(e.name) &&
      !/\.stories\.tsx$/.test(e.name) &&
      !/\.spec\.tsx$/.test(e.name)
    ) {
      compFiles.push({
        file: full,
        slug: e.name.replace(/\.tsx$/, ""),
        group: prefix,
      });
    }
  }
}
collectComponents(COMPONENTS_DIR);

// Detect slug collisions across groups so we can disambiguate component names
// (componentRowId hashes only source + name, so duplicate names → duplicate IDs).
const slugCount = compFiles.reduce(
  (m, c) => ((m[c.slug] = (m[c.slug] || 0) + 1), m),
  {},
);

const components = compFiles.map(({ file, slug, group }) => {
  const txt = readFileSync(file, "utf8");
  // Detect named exports (PascalCase).
  const exports = new Set();
  for (const m of txt.matchAll(
    /export\s+(?:const|function|class)\s+([A-Z][A-Za-z0-9_]*)/g,
  )) {
    exports.add(m[1]);
  }
  const variants = [];
  // Detect cva() variant keys
  const cvaMatch = txt.match(/cva\([\s\S]*?variants:\s*\{([\s\S]*?)\}\s*[,}]/m);
  if (cvaMatch) {
    const variantBlock = cvaMatch[1];
    for (const v of variantBlock.matchAll(/^\s*(\w+):\s*\{([^}]*)\}/gm)) {
      variants.push({
        prop: v[1],
        options: [...v[2].matchAll(/['"]?([\w-]+)['"]?\s*:/g)].map((x) => x[1]),
      });
    }
  }
  const sizes = (variants.find((v) => v.prop === "size") || {}).options || [];
  const variantValues =
    (variants.find((v) => v.prop === "variant") || {}).options || [];
  const baseName = pascal(slug);
  const qualifiedName =
    slugCount[slug] > 1 && group ? `${group}/${baseName}` : baseName;
  return {
    id: "",
    source: SOURCE,
    name: qualifiedName,
    discovered_via: "heuristic",
    file: file.replace(`${TARGET_ROOT}/`, ""),
    group: group || "primitive",
    exports: [...exports],
    variants: variantValues,
    sizes,
    occurrences: 1,
  };
});

const bucket = {
  schema: "ghost.bucket/v1",
  sources: [SOURCE],
  values,
  tokens,
  components,
};

console.log(JSON.stringify(bucket, null, 2));
process.stderr.write(
  `tokens: ${tokens.length}\nvalues: ${values.length}\ncomponents: ${components.length}\n`,
);
