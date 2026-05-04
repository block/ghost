#!/usr/bin/env node
import { execSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const MONOREPO_ROOT = "/Users/nahiyan/Development/square-web";
const TARGET_ROOT = `${MONOREPO_ROOT}/apps/managerbot`;
const UI_ROOT = `${MONOREPO_ROOT}/libs/managerbot/managerbot-ui`;
const WEB_ROOT = `${TARGET_ROOT}/managerbot-web`;
const STORYBOOK_ROOT = `${TARGET_ROOT}/managerbot-storybook`;
const THEME_CSS = `${UI_ROOT}/src/styles/theme.css`;
const GLOBALS_CSS = `${UI_ROOT}/src/styles/globals.css`;
const COMPONENTS_DIR = `${UI_ROOT}/src/components`;
const SCANNED_AT = "2026-05-04T00:00:00-04:00";
const COMMIT = execSync("git rev-parse --short HEAD", {
  cwd: MONOREPO_ROOT,
  encoding: "utf8",
}).trim();

const SOURCE = {
  id: "managerbot",
  role: "primary",
  target: "squareup/square-web/apps/managerbot",
  commit: COMMIT,
  scanned_at: SCANNED_AT,
  scanner_version: "dogfood-managerbot-v2",
};

const themeRaw = readFileSync(THEME_CSS, "utf8");
const globalsRaw = readFileSync(GLOBALS_CSS, "utf8");

// Walk the file linearly, tracking current selector/at-rule context.
// We only need the default token scope, dark overrides, and @theme inline.
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
  // The @theme inline block and the mirrored .managerbot-ui-root block both
  // hold reexports prefixed with --color-. We keep radius, shadow, text,
  // font, animate, etc.; those are canonical. We drop --color-<name> if its
  // value is exactly var(--<name>).
  if (!d.name.startsWith("--color-")) return false;
  const stripped = d.name.replace(/^--color-/, "");
  return d.value === `var(--${stripped})`;
}

const canonical = themeDecls.filter((d) => !isMechanicalReExport(d));

// Group by name → resolve aliases / by_theme.
// .managerbot-ui-root + @theme are the default theme; .dark and
// @utility .force-light add variants.
const byName = new Map();
for (const d of canonical) {
  const slot = byName.get(d.name) || {
    name: d.name,
    default: null,
    variants: {},
  };
  if (
    d.context === ":root" ||
    d.context === ".managerbot-ui-root" ||
    d.context.startsWith("@theme")
  ) {
    if (!slot.default) slot.default = d;
  } else if (d.context === ".dark" || d.context.includes(".dark")) {
    slot.variants.dark = d;
  } else if (d.context.includes("force-light")) {
    slot.variants.forceLight = d;
  } else {
    // unknown — record under context name
    slot.variants[d.context] = d;
  }
  byName.set(d.name, slot);
}

// Resolve var() chains within the default token scope to literals where possible.
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

function relativePath(file) {
  return file.replace(`${MONOREPO_ROOT}/`, "");
}

// Compute occurrences of each TOKEN NAME across the UI surface.
// We do this by reading every .tsx/.ts/.css/.mdx file under the shared UI
// library, app, and Storybook package.
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

const allFiles = [
  ...walk(`${UI_ROOT}/src`, []),
  ...walk(`${WEB_ROOT}/src`, []),
  ...walk(STORYBOOK_ROOT, []),
];
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
    let idx = txt.indexOf(needle);
    while (idx !== -1) {
      m++;
      idx += needle.length;
      idx = txt.indexOf(needle, idx);
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

function addValue(
  kind,
  literal,
  source_token,
  occ,
  files,
  usageKind = "token",
) {
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
      usage: {},
      tokens: [],
    });
  }
  const row = valueAcc.get(key);
  row.occurrences += occ;
  row.files_count = Math.max(row.files_count, files);
  row.usage[usageKind] = (row.usage[usageKind] || 0) + occ;
  row.tokens.push(source_token);
}

function deriveSpec(kind, lit) {
  if (kind === "color") {
    if (lit.startsWith("oklch")) return { space: "oklch" };
    if (lit.startsWith("oklab")) return { space: "lab" };
    if (lit.startsWith("rgba") || lit.startsWith("rgb"))
      return { space: "srgb" };
    if (lit.startsWith("#")) return { space: "srgb", hex: lit };
    return { space: "unknown" };
  }
  if (kind === "radius" || kind === "spacing") {
    const m = lit.match(/^([0-9.]+)(px|rem|em|%|vh|vw)$/);
    if (m) return { unit: m[2], scalar: Number(m[1]) };
    return { raw: lit };
  }
  if (kind === "typography") {
    const m = lit.match(/^([0-9.]+)(px|rem|em)$/);
    if (m) return { size: { unit: m[2], scalar: Number(m[1]) } };
    return { family: lit };
  }
  if (kind === "shadow") return { raw: lit };
  if (kind === "motion") return { easing: lit };
  return { raw: lit };
}

for (const t of tokens) {
  const lit = t.resolved_value;
  if (lit.startsWith("var(")) continue; // unresolved alias — skip; the chain captures it
  if (t.kind === "unknown") continue;
  addValue(t.kind, lit, t.name, t.occurrences || 1, t.files_count || 1);
}

function countRegex(regex) {
  const byValue = new Map();
  for (const [file, txt] of fileTexts) {
    regex.lastIndex = 0;
    for (const m of txt.matchAll(regex)) {
      const value = m[1];
      const slot = byValue.get(value) || { occ: 0, files: new Set() };
      slot.occ++;
      slot.files.add(file);
      byValue.set(value, slot);
    }
  }
  return byValue;
}

function normalizeBracketValue(value) {
  return value.replace(/_/g, " ");
}

for (const [rawValue, hit] of countRegex(/\brounded-\[([^\]]+)\]/g)) {
  const literal = normalizeBracketValue(rawValue);
  addValue(
    "radius",
    literal,
    `rounded-[${rawValue}]`,
    hit.occ,
    hit.files.size,
    "arbitrary_class",
  );
}

for (const [rawValue, hit] of countRegex(
  /\btext-\[([0-9.]+(?:px|rem|em))\]/g,
)) {
  const literal = normalizeBracketValue(rawValue);
  addValue(
    "typography",
    literal,
    `text-[${rawValue}]`,
    hit.occ,
    hit.files.size,
    "arbitrary_class",
  );
}

for (const [rawValue, hit] of countRegex(/\bshadow-\[([^\]]+)\]/g)) {
  const literal = normalizeBracketValue(rawValue);
  addValue(
    "shadow",
    literal,
    `shadow-[${rawValue}]`,
    hit.occ,
    hit.files.size,
    "arbitrary_class",
  );
}

for (const [rawValue, hit] of countRegex(
  /\b(?:bg|text|border|fill|stroke)-\[(#[0-9a-fA-F]{3,8})\]/g,
)) {
  const literal = rawValue.toUpperCase();
  addValue(
    "color",
    literal,
    `[${rawValue}]`,
    hit.occ,
    hit.files.size,
    "arbitrary_class",
  );
}

for (const [rawValue, hit] of countRegex(/['"`](#[0-9a-fA-F]{6})['"`]/g)) {
  const literal = rawValue.toUpperCase();
  addValue(
    "color",
    literal,
    rawValue,
    hit.occ,
    hit.files.size,
    "inline_literal",
  );
}

for (const [rawValue, hit] of countRegex(/\b(transition:\s*all\b)/g)) {
  addValue(
    "motion",
    rawValue,
    rawValue,
    hit.occ,
    hit.files.size,
    "inline_style",
  );
}

for (const [rawValue, hit] of countRegex(/\b(animate-spin)\b/g)) {
  addValue("motion", rawValue, rawValue, hit.occ, hit.files.size, "className");
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
    spec: { unit: "px", scalar: Number(px.replace("px", "")) },
    occurrences: 1,
    files_count: 1,
  });
}

const values = Array.from(valueAcc.values());

// Build components[] from filesystem.
// Recurse into design_system paths but exclude visx-charts and rjsf per surface_sources.
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
const slugCount = compFiles.reduce((m, c) => {
  m[c.slug] = (m[c.slug] || 0) + 1;
  return m;
}, {});

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
  const sizes = variants.find((v) => v.prop === "size")?.options || [];
  const variantValues =
    variants.find((v) => v.prop === "variant")?.options || [];
  const baseName = pascal(slug);
  const qualifiedName =
    slugCount[slug] > 1 && group ? `${group}/${baseName}` : baseName;
  return {
    id: "",
    source: SOURCE,
    name: qualifiedName,
    discovered_via: "heuristic",
    file: relativePath(file),
    group: group || "primitive",
    exports: [...exports],
    variants: variantValues,
    sizes,
    occurrences: 1,
  };
});

const survey = {
  schema: "ghost.survey/v2",
  sources: [SOURCE],
  values,
  tokens,
  components,
  ui_surfaces: [
    {
      id: "",
      source: SOURCE,
      name: "Managerbot conversation surface",
      kind: "source",
      locator: "apps/managerbot/managerbot-web/src/routes",
      renderability: "source-only",
      files: [
        "apps/managerbot/managerbot-web/src/routes",
        "apps/managerbot/managerbot-web/src/components",
        "libs/managerbot/managerbot-ui/src/components/ai-elements",
      ],
      classification: {
        intent: "operate an AI workflow",
        surface_type: "agent-workspace",
        density: "standard",
        layout_shape: "control-surface",
        confidence: 0.7,
      },
      signals: {
        dominant_components: [
          "PromptInput",
          "Conversation",
          "Artifact",
          "Button",
        ],
        layout_patterns: [
          "conversation pane with prompt controls and artifact surfaces",
        ],
        notes: [
          "Source-only scan across web routes and managerbot UI components.",
        ],
      },
    },
    {
      id: "",
      source: SOURCE,
      name: "Pulse dashboard",
      kind: "source",
      locator: "apps/managerbot/managerbot-web/src/routes/pulse.tsx",
      renderability: "source-only",
      files: [
        "apps/managerbot/managerbot-web/src/routes/pulse.tsx",
        "apps/managerbot/managerbot-web/src/components/pages/Pulse",
        "apps/managerbot/managerbot-web/src/components/pinned-widgets",
      ],
      classification: {
        intent: "monitor seller metrics and insights",
        surface_type: "dashboard",
        density: "standard",
        layout_shape: "tracker",
        confidence: 0.75,
      },
      signals: {
        dominant_components: ["View", "InsightsContent", "PinnedWidgets"],
        layout_patterns: ["wide content rail", "section stack", "metric cards"],
        notes: [
          "Pulse uses the View layout primitives with wide content and repeated insight/widget modules.",
        ],
      },
    },
    {
      id: "",
      source: SOURCE,
      name: "Tasks list",
      kind: "source",
      locator: "apps/managerbot/managerbot-web/src/routes/tasks.tsx",
      renderability: "source-only",
      files: [
        "apps/managerbot/managerbot-web/src/routes/tasks.tsx",
        "apps/managerbot/managerbot-web/src/components/tasks",
      ],
      classification: {
        intent: "review and resume AI sessions",
        surface_type: "task-list",
        density: "standard",
        layout_shape: "tracker",
        confidence: 0.78,
      },
      signals: {
        dominant_components: ["View", "ItemGroup", "Item", "Empty", "Skeleton"],
        layout_patterns: [
          "sectioned list",
          "recent and needs-attention groups",
        ],
        notes: [
          "Tasks uses narrow View content, stacked sections, and item rows rather than freeform cards.",
        ],
      },
    },
    {
      id: "",
      source: SOURCE,
      name: "Automation management",
      kind: "source",
      locator:
        "apps/managerbot/managerbot-web/src/routes/panels/automations.tsx",
      renderability: "source-only",
      files: [
        "apps/managerbot/managerbot-web/src/routes/panels/automations.tsx",
        "apps/managerbot/managerbot-web/src/components/automations",
      ],
      classification: {
        intent: "configure recurring AI work",
        surface_type: "automation-panel",
        density: "standard",
        layout_shape: "control-surface",
        confidence: 0.75,
      },
      signals: {
        dominant_components: ["View", "Item", "Badge", "Popover", "Select"],
        layout_patterns: [
          "panel list",
          "suggested automation cards",
          "compact popover controls",
        ],
        notes: [
          "Automation surfaces use Managerbot primitives but contain local rounded and shadow overrides for schedule popovers.",
        ],
      },
    },
  ],
};

console.log(JSON.stringify(survey, null, 2));
process.stderr.write(
  `tokens: ${tokens.length}\nvalues: ${values.length}\ncomponents: ${components.length}\n`,
);
