#!/usr/bin/env node
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const TARGET_ROOT = "/Users/nahiyan/Development/ghost/packages/ghost-ui";
const MAIN_CSS = `${TARGET_ROOT}/src/styles/main.css`;
const REGISTRY = `${TARGET_ROOT}/registry.json`;
const SRC = `${TARGET_ROOT}/src`;

const SOURCE = {
  id: "ghost-ui",
  role: "primary",
  target: "block/ghost@packages/ghost-ui",
  commit: "83c2b64",
  scanned_at: "2026-05-01T17:51:23Z",
  scanner_version: "dogfood-attempt-4",
};

const cssRaw = readFileSync(MAIN_CSS, "utf8");

// ---------- 1. Parse declarations from main.css.
// We need to track: which selector/at-rule context owns each `--name: value;`.
// Contexts of interest: ":root", ".dark", "@theme", "@theme inline".
// @keyframes blocks contain decls but they're not tokens — skip them.
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
    // Skip declarations inside @keyframes (those are animation steps, not tokens).
    const inKeyframes = stack.some((s) => s.startsWith("@keyframes"));
    if (inKeyframes) continue;
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

const allDecls = parseDecls(cssRaw);

// ---------- 2. Drop the mechanical Tailwind v4 re-export layer.
// `@theme inline` re-exports semantic vars under a `--color-*` namespace so
// Tailwind generates class atoms (`.bg-background`, etc.) from them. The
// re-exports are 1:1 aliases (`--color-X: var(--X)`) — they don't add design
// information beyond what's already in the semantic layer. Keep `@theme inline`
// declarations that introduce *new* tokens (`--radius-*`, `--shadow-*`,
// `--font-*`, `--spacing-*`, `--text-*`, `--breakpoint-*`, `--animate-*`).
function isMechanicalReExport(d) {
  if (!d.context.startsWith("@theme inline")) return false;
  if (!d.name.startsWith("--color-")) return false;
  const stripped = d.name.replace(/^--color-/, "");
  return d.value === `var(--${stripped})`;
}

const canonical = allDecls.filter((d) => !isMechanicalReExport(d));

// ---------- 3. Group declarations by token name → resolve default + variants.
// `:root` / `@theme` / `@theme inline` all declare the *default* (light) value.
// `.dark` declares the dark variant.
const byName = new Map();
for (const d of canonical) {
  const slot = byName.get(d.name) || {
    name: d.name,
    default: null,
    variants: {},
  };
  if (
    d.context === ":root" ||
    d.context === "@theme" ||
    d.context.startsWith("@theme")
  ) {
    if (!slot.default) slot.default = d;
  } else if (d.context === ".dark") {
    slot.variants.dark = d;
  } else {
    slot.variants[d.context] = d;
  }
  byName.set(d.name, slot);
}

// Resolve `var(--x)` chains within the default scope to a literal where possible.
const rootScope = new Map();
for (const [name, slot] of byName) {
  if (slot.default) rootScope.set(name, slot.default.value);
}

function resolveLiteral(value, scope) {
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

// ---------- 4. Classify each token by kind.
// Resolved literal beats name pattern when they disagree. `--text-default`
// looks like a typography token by name but resolves to a color — it's a
// foreground color role. Same for `--ring`, `--border-strong`, etc.
function classify(name, _value, resolved) {
  // Hard kind by name prefix (these are unambiguous).
  if (name.startsWith("--shadow-")) return "shadow";
  if (name.startsWith("--radius") || name === "--radius") return "radius";
  if (name.startsWith("--breakpoint-")) return "breakpoint";
  if (
    name.startsWith("--animate-") ||
    name.startsWith("--ease-") ||
    name.startsWith("--duration-")
  )
    return "motion";

  // Resolved-literal check before name-based color guesses. Anything that
  // resolves to a color literal is a color token regardless of name.
  if (resolved && /^(oklch|oklab|rgba?|hsla?)\(/i.test(resolved))
    return "color";
  if (resolved && /^#[0-9a-fA-F]{3,8}$/.test(resolved)) return "color";

  // Length / size tokens by name.
  if (name.startsWith("--font-")) return "typography";
  if (
    name.startsWith("--heading-") ||
    name.startsWith("--display-") ||
    name.startsWith("--body-") ||
    name.startsWith("--label-") ||
    name.startsWith("--pullquote-")
  )
    return "typography";
  // `--text-xxs` etc. are size; `--text-default` is color (caught above).
  if (name.startsWith("--text-")) return "typography";
  if (name.startsWith("--spacing-")) return "spacing";
  if (
    name === "--page-container-max-width" ||
    name === "--page-container-side-gutter" ||
    name === "--section-padding-vertical" ||
    name === "--section-heading-margin-bottom"
  )
    return "spacing";

  // Color by name pattern (when resolved isn't a literal yet — e.g. unresolved
  // alias still pointing into the var graph).
  if (
    /^--(background|foreground|card|popover|primary|secondary|muted|accent|destructive|border|input|ring|sidebar|chart|color-|surface-|dark-)/.test(
      name,
    )
  )
    return "color";
  if (/^--(black|white|red|blue|green|yellow|gray)/.test(name)) return "color";
  return "unknown";
}

// ---------- 5. Count occurrences of token names across the source tree.
// A token is "used" when its `--name` literal or `var(--name)` appears in a
// .ts/.tsx/.css/.mjs file under src/. Tailwind class atoms (`bg-primary`)
// don't reference the token by name — they reference the @theme inline
// re-export, so direct token usage undercounts components that consume
// tokens via Tailwind. We still count `--name` directly because it's the
// most reliable cross-codebase signal without a full Tailwind pass.
function walk(dir, out, exclude = []) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (exclude.includes(e.name)) continue;
    if (
      e.name === "node_modules" ||
      e.name === "dist" ||
      e.name === "dist-lib" ||
      e.name === "dist-mcp" ||
      e.name === "mcp"
    )
      continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) walk(full, out, exclude);
    else if (/\.(tsx?|jsx?|css|mjs|md)$/.test(e.name)) out.push(full);
  }
  return out;
}

const allFiles = walk(SRC, []);
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
    while (true) {
      idx = txt.indexOf(needle, idx);
      if (idx === -1) break;
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

// ---------- 6. Build tokens[].
const tokens = [];
for (const [name, slot] of byName) {
  const def = slot.default;
  if (!def) continue;
  const resolved = resolveLiteral(def.value, rootScope);
  const kind = classify(name, def.value, resolved);
  const aliasMatch = def.value.match(/^var\((--[a-zA-Z0-9_-]+)\)$/);
  const alias_chain = aliasMatch ? [name, aliasMatch[1]] : [];
  // If the alias resolves through more than one hop, expand the chain fully.
  if (aliasMatch) {
    const seen = new Set([name, aliasMatch[1]]);
    let cur = aliasMatch[1];
    while (true) {
      const nextSlot = byName.get(cur);
      if (!nextSlot?.default) break;
      const nextMatch = nextSlot.default.value.match(
        /^var\((--[a-zA-Z0-9_-]+)\)$/,
      );
      if (!nextMatch) break;
      if (seen.has(nextMatch[1])) break;
      alias_chain.push(nextMatch[1]);
      seen.add(nextMatch[1]);
      cur = nextMatch[1];
    }
  }
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

  const variants = {};
  if (slot.variants.dark) variants.dark = slot.variants.dark.value;
  if (Object.keys(variants).length) {
    row.by_theme = { default: def.value, ...variants };
  }
  tokens.push(row);
}

// ---------- 7. Build values[] — distinct literals shipped by the design system.
const valueAcc = new Map();
function addValue(kind, literal, sourceToken, occ, files) {
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
  if (sourceToken) row.tokens.push(sourceToken);
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
    if (lit.startsWith("clamp(")) return { source: lit };
    return { source: lit };
  }
  if (kind === "typography") {
    const m = lit.match(/^([0-9.]+)(px|rem|em)$/);
    if (m) return { unit: m[2], magnitude: Number(m[1]) };
    return { source: lit };
  }
  if (kind === "shadow") return { source: lit };
  if (kind === "motion") return { source: lit };
  if (kind === "breakpoint") {
    const m = lit.match(/^([0-9.]+)(px|rem|em)$/);
    if (m) return { unit: m[2], magnitude: Number(m[1]) };
    return { source: lit };
  }
  return { source: lit };
}

for (const t of tokens) {
  const lit = t.resolved_value;
  if (lit.startsWith("var(")) continue; // unresolved alias
  if (t.kind === "unknown") continue;
  addValue(t.kind, lit, t.name, t.occurrences || 1, t.files_count || 1);
}

// Inline literals authored directly in main.css (selection bg, scrollbar colors).
// These don't have a token name, but they ship as part of the design language.
const inlineColorRe = /#[0-9a-fA-F]{3,8}\b/g;
const inlineHits = new Map(); // hex → count
for (const m of cssRaw.matchAll(inlineColorRe)) {
  inlineHits.set(m[0], (inlineHits.get(m[0]) || 0) + 1);
}
// Subtract the @theme block's hex declarations (we already recorded those).
// We do this by removing the @theme block range from the search text.
const themeBlockRe = /@theme \{[\s\S]*?\n\}/g;
let cssNoTheme = cssRaw;
for (const m of cssRaw.matchAll(themeBlockRe))
  cssNoTheme = cssNoTheme.replace(m[0], "");
const inlineOnlyHits = new Map();
for (const m of cssNoTheme.matchAll(inlineColorRe)) {
  inlineOnlyHits.set(m[0], (inlineOnlyHits.get(m[0]) || 0) + 1);
}
for (const [hex, n] of inlineOnlyHits) {
  // Skip if it's already a token literal we recorded above.
  const key = `color|${hex}`;
  if (valueAcc.has(key)) continue;
  addValue("color", hex, null, n, 1);
}

// Breakpoints from @media queries, plus the explicit --breakpoint-* tokens.
const bpHits = [...cssRaw.matchAll(/@media\s*\(min-width:\s*([0-9]+)(px)\)/g)];
for (const m of bpHits) {
  const lit = `${m[1]}${m[2]}`;
  const key = `breakpoint|${lit}`;
  if (!valueAcc.has(key)) addValue("breakpoint", lit, null, 1, 1);
}

// ---------- 8. Build components[] — registry.json is the canonical signal.
const registry = JSON.parse(readFileSync(REGISTRY, "utf8"));
const uiItems = registry.items.filter((i) => i.type === "registry:ui");
const components = [];

for (const item of uiItems) {
  const target = item.files[0]?.target || "";
  const filePath = item.files[0]?.path || "";
  const fullPath = `${TARGET_ROOT}/${filePath}`;
  let txt = "";
  try {
    txt = readFileSync(fullPath, "utf8");
  } catch {
    txt = "";
  }
  const exports = new Set();
  for (const m of txt.matchAll(
    /export\s+(?:const|function|class)\s+([A-Z][A-Za-z0-9_]*)/g,
  )) {
    exports.add(m[1]);
  }
  const variants = [];
  const cvaMatch = txt.match(
    /cva\([\s\S]*?variants:\s*\{([\s\S]*?)\n\s{2,4}\}/m,
  );
  if (cvaMatch) {
    const variantBlock = cvaMatch[1];
    for (const v of variantBlock.matchAll(/^\s*(\w+):\s*\{([^}]*)\}/gm)) {
      variants.push({
        prop: v[1],
        options: [...v[2].matchAll(/['"]?([\w-]+)['"]?\s*:/g)].map((x) => x[1]),
      });
    }
  }
  const sizes = variants.find((v) => v.prop === "size")?.options || [];
  const variantValues =
    variants.find((v) => v.prop === "variant")?.options || [];

  // Disambiguate `ui/` vs `ai-elements/` so identical names don't collide
  // at fix-ids time (componentRowId hashes only source + name).
  const group = target.startsWith("components/ai-elements")
    ? "ai-elements"
    : "ui";
  const baseName = item.name
    .split(/[-_]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");

  // Are there name collisions across groups? Pre-compute.
  components.push({
    id: "",
    source: SOURCE,
    name: baseName,
    _slug: item.name,
    _group: group,
    discovered_via: "registry.json",
    file: filePath,
    group,
    categories: item.categories || [],
    exports: [...exports],
    variants: variantValues,
    sizes,
    occurrences: 1,
  });
}

// Detect cross-group name collisions; qualify with group prefix.
const slugCount = components.reduce((m, c) => {
  m[c._slug] = (m[c._slug] || 0) + 1;
  return m;
}, {});
for (const c of components) {
  if (slugCount[c._slug] > 1) c.name = `${c._group}/${c.name}`;
  delete c._slug;
  delete c._group;
}

// ---------- 9. Emit.
const values = Array.from(valueAcc.values());
const survey = {
  schema: "ghost.survey/v1",
  sources: [SOURCE],
  values,
  tokens,
  components,
};

const outPath =
  "/Users/nahiyan/Development/ghost/dogfood/ghost-ui/attempt-4/survey.json";
writeFileSync(outPath, `${JSON.stringify(survey, null, 2)}\n`);
process.stderr.write(
  `tokens: ${tokens.length}\nvalues: ${values.length}\ncomponents: ${components.length}\nout: ${outPath}\n`,
);
