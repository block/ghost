#!/usr/bin/env node
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, join, relative } from "node:path";

const TARGET_ROOT = "/Users/nahiyan/Development/ghost/packages/ghost-ui";
const OUT =
  "/Users/nahiyan/Development/ghost/dogfood/ghost-ui/attempt-5/bucket.json";

const SOURCE = {
  id: "ghost-ui",
  role: "primary",
  target: "block/ghost@packages/ghost-ui",
  commit: "83c2b64",
  scanned_at: "2026-05-01T18:04:43Z",
  scanner_version: "dogfood-attempt-5",
};

const MAIN_CSS = join(TARGET_ROOT, "src/styles/main.css");
const THEME_PRESETS = join(TARGET_ROOT, "src/lib/theme-presets.ts");
const REGISTRY = join(TARGET_ROOT, "registry.json");
const SURFACE_DIRS = [
  "src/components/ui",
  "src/components/ai-elements",
  "src/components/theme",
  "src/hooks",
  "src/styles",
  "src/lib",
];

const TAILWIND_TEXT_SIZE_PX = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
  "4xl": 36,
  "5xl": 48,
  "6xl": 60,
  "7xl": 72,
  "8xl": 96,
  "9xl": 128,
};

const TAILWIND_FONT_WEIGHTS = {
  thin: 100,
  extralight: 200,
  light: 300,
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
  black: 900,
};

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      walk(path, acc);
    } else {
      acc.push(path);
    }
  }
  return acc;
}

function rel(path) {
  return relative(TARGET_ROOT, path);
}

function read(path) {
  return readFileSync(path, "utf8");
}

const surfaceFiles = SURFACE_DIRS.flatMap((dir) =>
  walk(join(TARGET_ROOT, dir)),
).filter((path) => /\.(css|tsx?|jsx?)$/.test(path));

const fileText = new Map(surfaceFiles.map((path) => [path, read(path)]));

function parseCssVariables(css) {
  const vars = new Map();
  const lines = css.split(/\r?\n/);
  let scope = null;
  let depth = 0;
  let pending = null;

  function addDecl(name, value, line) {
    const entry = vars.get(name) ?? {};
    entry[scope] = { value: value.trim().replace(/\s+/g, " "), line };
    vars.set(name, entry);
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!scope) {
      if (trimmed.startsWith("@theme inline")) {
        scope = "theme-inline";
        depth = 0;
      } else if (trimmed.startsWith("@theme")) {
        scope = "theme";
        depth = 0;
      } else if (trimmed.startsWith(":root")) {
        scope = "root";
        depth = 0;
      } else if (trimmed.startsWith(".dark")) {
        scope = "dark";
        depth = 0;
      }
    }

    if (scope && pending) {
      pending.value += ` ${trimmed.replace(/;$/, "")}`;
      if (trimmed.includes(";")) {
        addDecl(pending.name, pending.value, pending.line);
        pending = null;
      }
    } else if (scope) {
      const match = trimmed.match(/^(--[a-zA-Z0-9_-]+):\s*(.*)$/);
      if (match) {
        const name = match[1];
        const value = match[2].replace(/;$/, "");
        if (match[2].includes(";")) {
          addDecl(name, value, i + 1);
        } else {
          pending = { name, value, line: i + 1 };
        }
      }
    }

    if (scope) {
      depth += countChar(rawLine, "{");
      depth -= countChar(rawLine, "}");
      if (depth <= 0 && trimmed.endsWith("}")) {
        scope = null;
        depth = 0;
        pending = null;
      }
    }
  }

  return vars;
}

function countChar(text, char) {
  let count = 0;
  for (const current of text) {
    if (current === char) count++;
  }
  return count;
}

function parsePresetOverrides(ts) {
  const overrides = new Map();
  const lines = ts.split(/\r?\n/);
  let preset = null;
  let mode = null;
  let depth = 0;

  for (const line of lines) {
    const idMatch = line.match(/^\s*id:\s*"([^"]+)"/);
    if (idMatch) preset = idMatch[1];

    if (preset && !mode) {
      if (line.match(/^\s*light:\s*{/)) {
        mode = "light";
        depth = 0;
      } else if (line.match(/^\s*dark:\s*{/)) {
        mode = "dark";
        depth = 0;
      }
    }

    if (preset && mode) {
      const valueMatch = line.match(/^\s*"([^"]+)":\s*"([^"]+)"/);
      if (valueMatch) {
        const name = valueMatch[1];
        const value = valueMatch[2];
        const key = `${preset}:${mode}`;
        const entry = overrides.get(name) ?? {};
        entry[key] = value;
        overrides.set(name, entry);
      }
      depth += countChar(line, "{");
      depth -= countChar(line, "}");
      if (depth <= 0 && line.trim().startsWith("}")) {
        mode = null;
      }
    }
  }

  return overrides;
}

const cssVars = parseCssVariables(read(MAIN_CSS));
const presetOverrides = parsePresetOverrides(read(THEME_PRESETS));

function rawFor(name, mode = "default") {
  const entry = cssVars.get(name);
  if (!entry) return undefined;
  if (mode === "dark") {
    return (
      entry.dark?.value ??
      entry.root?.value ??
      entry.theme?.value ??
      entry["theme-inline"]?.value
    );
  }
  return (
    entry.root?.value ??
    entry.theme?.value ??
    entry["theme-inline"]?.value ??
    entry.dark?.value
  );
}

function resolveToken(name, mode = "default", seen = []) {
  if (seen.includes(name)) {
    return { value: rawFor(name, mode) ?? name, chain: seen, resolved: false };
  }

  const raw = rawFor(name, mode);
  if (!raw) {
    return { value: name, chain: seen, resolved: false };
  }

  const varMatch = raw.match(/^var\((--[a-zA-Z0-9_-]+)(?:,[^)]+)?\)$/);
  if (varMatch) {
    const next = varMatch[1];
    const resolved = resolveToken(next, mode, [...seen, name]);
    return { ...resolved, chain: [next, ...resolved.chain] };
  }

  const calcMatch = raw.match(
    /^calc\(var\((--[a-zA-Z0-9_-]+)\)\s*([+-])\s*([0-9.]+)px\)$/,
  );
  if (calcMatch) {
    const baseName = calcMatch[1];
    const op = calcMatch[2];
    const delta = Number(calcMatch[3]);
    const base = resolveToken(baseName, mode, [...seen, baseName]);
    const parsed = parseLength(base.value);
    if (parsed) {
      const basePx = toPx(parsed.scalar, parsed.unit);
      const value = op === "+" ? basePx + delta : basePx - delta;
      return {
        value: `${formatNumber(value)}px`,
        chain: [...seen, baseName],
        resolved: true,
      };
    }
  }

  return { value: raw, chain: seen, resolved: true };
}

function parseLength(raw) {
  const text = String(raw).trim();
  if (text === "0") return { scalar: 0, unit: "px" };
  const match = text.match(/^(-?[0-9.]+)(px|rem|em|vw|vh|%)$/);
  if (!match) return null;
  return { scalar: Number(match[1]), unit: match[2] };
}

function toPx(scalar, unit) {
  if (unit === "rem" || unit === "em") return scalar * 16;
  return scalar;
}

function formatNumber(n) {
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(3)));
}

function normalizeScalarValue(raw) {
  const parsed = parseLength(raw);
  if (!parsed) return String(raw).trim();
  if (parsed.unit === "px" || parsed.unit === "rem" || parsed.unit === "em") {
    return `${formatNumber(toPx(parsed.scalar, parsed.unit))}px`;
  }
  return `${formatNumber(parsed.scalar)}${parsed.unit}`;
}

function normalizeColor(raw) {
  return String(raw)
    .trim()
    .replace(/^#([0-9A-Fa-f]+)/, (_, hex) => `#${hex.toLowerCase()}`);
}

function kindForToken(name, value) {
  const raw = String(value).trim();
  if (
    raw.startsWith("#") ||
    raw.startsWith("rgb") ||
    name.startsWith("--color-") ||
    name.startsWith("--background") ||
    name.startsWith("--border") ||
    name.startsWith("--text-") ||
    name.startsWith("--chart") ||
    name.startsWith("--ring") ||
    name.startsWith("--dark") ||
    name.startsWith("--surface")
  ) {
    return raw.match(/^(#[0-9A-Fa-f]{3,8}|rgba?\(|hsla?\()/) ? "color" : null;
  }
  if (name.startsWith("--radius")) return "radius";
  if (name.startsWith("--shadow")) return "shadow";
  if (
    name.startsWith("--font") ||
    name.startsWith("--heading") ||
    name.startsWith("--display") ||
    name.startsWith("--body") ||
    name.startsWith("--label") ||
    name.startsWith("--pullquote") ||
    name === "--text-xxs"
  ) {
    return "typography";
  }
  if (
    name.startsWith("--spacing") ||
    name.startsWith("--page") ||
    name.startsWith("--section")
  ) {
    return name.includes("max-width") ? "breakpoint" : "spacing";
  }
  if (name.startsWith("--breakpoint")) return "breakpoint";
  if (
    name.startsWith("--duration") ||
    name.startsWith("--ease") ||
    name.startsWith("--animate")
  ) {
    return "motion";
  }
  return null;
}

function normalizeValue(kind, value) {
  if (kind === "color") return normalizeColor(value);
  if (kind === "spacing" || kind === "radius" || kind === "breakpoint") {
    return normalizeScalarValue(value);
  }
  if (kind === "motion") {
    const text = String(value).trim();
    const seconds = text.match(/^([0-9.]+)s$/);
    if (seconds) return `${formatNumber(Number(seconds[1]) * 1000)}ms`;
    return text;
  }
  return String(value).trim();
}

function specFor(kind, value) {
  if (kind === "color") {
    if (value.startsWith("#")) return { space: "srgb", hex: value };
    return { space: "unknown" };
  }
  if (kind === "spacing" || kind === "radius" || kind === "breakpoint") {
    const parsed = parseLength(value);
    if (parsed) return parsed;
  }
  if (kind === "motion") {
    const ms = value.match(/^([0-9.]+)ms$/);
    if (ms) return { duration_ms: Number(ms[1]) };
    return { easing: value };
  }
  if (kind === "typography") {
    const parsed = parseLength(value);
    if (parsed) return { size: parsed };
    if (/^[0-9]+$/.test(value)) return { weight: Number(value) };
    return { family: value };
  }
  return undefined;
}

const values = new Map();

function addValue(kind, value, raw, count, files, usageKey, role) {
  if (!kind || !value) return;
  const normalized = normalizeValue(kind, value);
  if (!normalized || normalized === "initial") return;
  const key = `${kind}|${normalized}`;
  const row = values.get(key) ?? {
    id: "",
    source: SOURCE,
    kind,
    value: normalized,
    raw,
    spec: specFor(kind, normalized),
    occurrences: 0,
    files: new Set(),
    usage: {},
    role_hypothesis: role,
  };
  row.occurrences += count;
  for (const file of files) row.files.add(file);
  row.usage[usageKey] = (row.usage[usageKey] ?? 0) + count;
  if (!row.role_hypothesis && role) row.role_hypothesis = role;
  values.set(key, row);
}

function countNeedle(needle) {
  let occurrences = 0;
  const files = new Set();
  for (const [file, text] of fileText) {
    let index = text.indexOf(needle);
    while (index !== -1) {
      occurrences++;
      files.add(rel(file));
      index = text.indexOf(needle, index + needle.length);
    }
  }
  return { occurrences, files };
}

const tokens = [];
for (const name of [...cssVars.keys()].sort()) {
  const resolved = resolveToken(name);
  const dark = resolveToken(name, "dark");
  const seen = countNeedle(name);
  const byTheme = {};
  if (dark.resolved && dark.value !== resolved.value) {
    byTheme.dark = normalizeValue(
      kindForToken(name, dark.value) ?? "",
      dark.value,
    );
  }
  const presetForName = presetOverrides.get(name);
  if (presetForName) {
    for (const [theme, raw] of Object.entries(presetForName)) {
      const kind = kindForToken(name, raw);
      byTheme[theme] = kind ? normalizeValue(kind, raw) : raw;
    }
  }

  tokens.push({
    id: "",
    source: SOURCE,
    name,
    alias_chain: resolved.chain,
    resolved_value: normalizeValue(
      kindForToken(name, resolved.value) ?? "",
      resolved.value,
    ),
    ...(Object.keys(byTheme).length ? { by_theme: byTheme } : {}),
    occurrences: Math.max(1, seen.occurrences),
  });

  const kind = kindForToken(name, resolved.value);
  if (kind) {
    addValue(
      kind,
      resolved.value,
      name,
      Math.max(1, seen.occurrences),
      seen.files.size ? seen.files : new Set(["src/styles/main.css"]),
      "css_var",
      roleForToken(name),
    );
  }
  for (const raw of Object.values(presetForName ?? {})) {
    const kindForPreset = kindForToken(name, raw);
    if (kindForPreset) {
      addValue(
        kindForPreset,
        raw,
        name,
        1,
        new Set(["src/lib/theme-presets.ts"]),
        "theme_preset",
        roleForToken(name),
      );
    }
  }
}

function roleForToken(name) {
  if (name.includes("danger") || name.includes("destructive")) return "danger";
  if (name.includes("success")) return "success";
  if (name.includes("warning")) return "warning";
  if (name.includes("info")) return "info";
  if (name.includes("chart")) return "chart";
  if (name.includes("background")) return "surface";
  if (name.includes("border")) return "border";
  if (name.includes("text") || name.includes("foreground")) return "text";
  if (name.includes("radius")) return "shape";
  if (name.includes("shadow")) return "elevation";
  return undefined;
}

const unresolvedTokens = new Map();

function addUnresolvedToken(name, atom, count, files) {
  const current = unresolvedTokens.get(name) ?? {
    name,
    atoms: new Set(),
    occurrences: 0,
    files: new Set(),
  };
  current.atoms.add(atom);
  current.occurrences += count;
  for (const file of files) current.files.add(file);
  unresolvedTokens.set(name, current);
}

function extractAtoms() {
  const atoms = new Map();
  const atomRe =
    /\b(bg|text|border|fill|stroke|ring|outline|from|to|via|p[lrtbxy]?|m[lrtbxy]?|w|h|min-w|min-h|max-w|max-h|size|gap|space-[xy]|inset(?:-[xy])?|top|right|bottom|left|rounded(?:-[a-z0-9]+)?|shadow|duration|ease|animate|font)-[a-zA-Z0-9./:%_#-]+(?:\[[^\]]+\])?/g;
  for (const [file, text] of fileText) {
    if (!/\.(tsx?|jsx?)$/.test(file)) continue;
    for (const match of text.matchAll(atomRe)) {
      const atom = match[0];
      const entry = atoms.get(atom) ?? { count: 0, files: new Set() };
      entry.count++;
      entry.files.add(rel(file));
      atoms.set(atom, entry);
    }
  }
  return atoms;
}

function suffix(atom) {
  return atom.slice(atom.indexOf("-") + 1).split("/")[0];
}

function numericSpacingValue(value) {
  if (value === "px") return 1;
  if (value === "0") return 0;
  const fraction = value.match(/^([0-9]+)\/([0-9]+)$/);
  if (fraction) return null;
  const n = Number(value);
  if (Number.isFinite(n)) return n * 4;
  return null;
}

function bracketValue(atom) {
  const match = atom.match(/\[([^\]]+)\]/);
  return match?.[1];
}

function tokenValue(name, mode = "default") {
  if (!cssVars.has(name)) return null;
  const resolved = resolveToken(name, mode);
  return resolved.resolved ? resolved.value : null;
}

function resolveColorAtom(atom, tokenSuffix, entry) {
  const token = `--color-${tokenSuffix}`;
  const value = tokenValue(token);
  if (value) {
    addValue(
      "color",
      value,
      atom,
      entry.count,
      entry.files,
      "className",
      roleForToken(token),
    );
  } else if (looksLikeMissingColor(tokenSuffix)) {
    addUnresolvedToken(token, atom, entry.count, entry.files);
  }
}

function looksLikeMissingColor(tokenSuffix) {
  return /^(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]{2,3}$/.test(
    tokenSuffix,
  );
}

function handleAtom(atom, entry) {
  const rawSuffix = suffix(atom);
  const bracket = bracketValue(atom);

  if (atom.startsWith("font-")) {
    if (TAILWIND_FONT_WEIGHTS[rawSuffix] !== undefined) {
      addValue(
        "typography",
        String(TAILWIND_FONT_WEIGHTS[rawSuffix]),
        atom,
        entry.count,
        entry.files,
        "className",
        "font-weight",
      );
    } else {
      const token = `--font-${rawSuffix}`;
      const value = tokenValue(token);
      if (value) {
        addValue(
          "typography",
          value,
          atom,
          entry.count,
          entry.files,
          "className",
          "font-family",
        );
      }
    }
    return;
  }

  if (atom.startsWith("text-")) {
    if (
      [
        "left",
        "right",
        "center",
        "justify",
        "balance",
        "pretty",
        "wrap",
        "nowrap",
        "ellipsis",
        "clip",
        "current",
        "transparent",
      ].includes(rawSuffix)
    ) {
      return;
    }
    if (TAILWIND_TEXT_SIZE_PX[rawSuffix] !== undefined) {
      addValue(
        "typography",
        `${TAILWIND_TEXT_SIZE_PX[rawSuffix]}px`,
        atom,
        entry.count,
        entry.files,
        "className",
        "font-size",
      );
      return;
    }
    if (bracket) {
      addValue(
        "typography",
        bracket,
        atom,
        entry.count,
        entry.files,
        "className",
        "font-size",
      );
      return;
    }
    resolveColorAtom(atom, rawSuffix, entry);
    return;
  }

  if (
    atom.startsWith("bg-") ||
    atom.startsWith("border-") ||
    atom.startsWith("ring-") ||
    atom.startsWith("fill-") ||
    atom.startsWith("stroke-") ||
    atom.startsWith("from-") ||
    atom.startsWith("to-") ||
    atom.startsWith("via-")
  ) {
    if (
      /^(border|ring)-offset-/.test(atom) ||
      /^border-[trblxy](?:-|$)/.test(atom) ||
      [
        "b",
        "t",
        "l",
        "r",
        "x",
        "y",
        "dashed",
        "solid",
        "collapse",
        "separate",
      ].includes(rawSuffix)
    ) {
      return;
    }
    if (
      (atom.startsWith("from-") ||
        atom.startsWith("to-") ||
        atom.startsWith("via-")) &&
      [
        "top",
        "right",
        "bottom",
        "left",
        "start",
        "end",
        "top-2",
        "right-2",
        "bottom-2",
        "left-2",
        "top-4",
        "right-4",
        "bottom-4",
        "left-4",
        "left-52",
        "right-52",
      ].includes(rawSuffix)
    ) {
      return;
    }
    if (bracket?.startsWith("#")) {
      addValue("color", bracket, atom, entry.count, entry.files, "className");
      return;
    }
    if (/^(0|2|4|8)$/.test(rawSuffix) && !atom.startsWith("bg-")) return;
    if (["none", "transparent", "current"].includes(rawSuffix)) return;
    resolveColorAtom(atom, rawSuffix, entry);
    return;
  }

  if (
    /^(p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|w|h|min-w|min-h|max-w|max-h|size|gap|space-x|space-y|inset|inset-x|inset-y|top|right|bottom|left)-/.test(
      atom,
    )
  ) {
    if (
      ["full", "fit", "auto", "screen", "min", "max", "0.5"].includes(rawSuffix)
    ) {
      if (rawSuffix !== "0.5") return;
    }
    const tokenName = atom.startsWith("h-") ? `--spacing-${rawSuffix}` : null;
    const tokenResolved = tokenName ? tokenValue(tokenName) : null;
    if (tokenResolved) {
      addValue(
        "spacing",
        tokenResolved,
        atom,
        entry.count,
        entry.files,
        "className",
      );
      return;
    }
    const scalar = bracket ? null : numericSpacingValue(rawSuffix);
    if (scalar !== null) {
      addValue(
        "spacing",
        `${scalar}px`,
        atom,
        entry.count,
        entry.files,
        "className",
      );
    } else if (bracket) {
      addValue("spacing", bracket, atom, entry.count, entry.files, "className");
    }
    return;
  }

  if (atom.startsWith("rounded")) {
    if (atom === "rounded-full") {
      addValue(
        "radius",
        "999px",
        atom,
        entry.count,
        entry.files,
        "className",
        "pill",
      );
      return;
    }
    if (atom === "rounded-none") {
      addValue("radius", "0px", atom, entry.count, entry.files, "className");
      return;
    }
    if (bracket) {
      addValue("radius", bracket, atom, entry.count, entry.files, "className");
      return;
    }
    const radiusSuffix = rawSuffix.replace(/^-[a-z]+-/, "");
    const token = `--radius-${radiusSuffix}`;
    const value = tokenValue(token);
    if (value) {
      addValue(
        "radius",
        value,
        atom,
        entry.count,
        entry.files,
        "className",
        "shape",
      );
    }
    return;
  }

  if (atom.startsWith("shadow-")) {
    if (rawSuffix === "none") {
      addValue("shadow", "none", atom, entry.count, entry.files, "className");
      return;
    }
    const token = `--shadow-${rawSuffix}`;
    const value = tokenValue(token);
    if (value) {
      addValue(
        "shadow",
        value,
        atom,
        entry.count,
        entry.files,
        "className",
        "elevation",
      );
    }
    return;
  }

  if (atom.startsWith("duration-")) {
    const n = Number(rawSuffix);
    if (Number.isFinite(n)) {
      addValue("motion", `${n}ms`, atom, entry.count, entry.files, "className");
    }
    return;
  }

  if (atom.startsWith("ease-")) {
    addValue("motion", rawSuffix, atom, entry.count, entry.files, "className");
    return;
  }

  if (atom.startsWith("animate-")) {
    const token = `--animate-${rawSuffix}`;
    const value = tokenValue(token);
    addValue(
      "motion",
      value ?? rawSuffix,
      atom,
      entry.count,
      entry.files,
      "className",
    );
  }
}

for (const [atom, entry] of extractAtoms()) {
  handleAtom(atom, entry);
}

for (const unresolved of unresolvedTokens.values()) {
  tokens.push({
    id: "",
    source: SOURCE,
    name: unresolved.name,
    alias_chain: [],
    resolved_value: "unresolved",
    occurrences: unresolved.occurrences,
    resolution: {
      status: "unresolved-local",
      symbol: [...unresolved.atoms].sort().join(", "),
      message:
        "Tailwind class atom references a color token not declared after --color-* reset.",
    },
  });
}

function extractObjectKeys(text, property) {
  const marker = `${property}: {`;
  const idx = text.indexOf(marker);
  if (idx === -1) return [];
  const start = text.indexOf("{", idx);
  let depth = 0;
  let end = start;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") depth++;
    if (text[i] === "}") depth--;
    if (depth === 0) {
      end = i;
      break;
    }
  }
  const block = text.slice(start + 1, end);
  return [...block.matchAll(/^\s*"?([a-zA-Z0-9_-]+)"?:\s/gm)]
    .map((match) => match[1])
    .filter(
      (key) => !["className", "variants", "defaultVariants"].includes(key),
    );
}

const registry = JSON.parse(read(REGISTRY));
const components = [];
for (const item of registry.items.filter(
  (entry) => entry.type === "registry:ui",
)) {
  const filePath = item.files?.[0]?.path
    ? join(TARGET_ROOT, item.files[0].path)
    : null;
  const text = filePath ? read(filePath) : "";
  const variants = extractObjectKeys(text, "variant");
  const sizes = extractObjectKeys(text, "size");
  components.push({
    id: "",
    source: SOURCE,
    name: item.name,
    discovered_via: "registry.json",
    ...(variants.length ? { variants } : {}),
    ...(sizes.length ? { sizes } : {}),
  });
}

for (const path of walk(join(TARGET_ROOT, "src/components/theme")).filter(
  (file) => file.endsWith(".tsx"),
)) {
  components.push({
    id: "",
    source: SOURCE,
    name: basename(path, ".tsx"),
    discovered_via: "source:src/components/theme",
  });
}

const bucket = {
  schema: "ghost.bucket/v1",
  sources: [SOURCE],
  values: [...values.values()]
    .map((row) => {
      const out = {
        id: row.id,
        source: row.source,
        kind: row.kind,
        value: row.value,
        raw: row.raw,
        ...(row.spec ? { spec: row.spec } : {}),
        occurrences: row.occurrences,
        files_count: row.files.size,
        usage: row.usage,
        ...(row.role_hypothesis
          ? { role_hypothesis: row.role_hypothesis }
          : {}),
      };
      return out;
    })
    .sort(
      (a, b) => a.kind.localeCompare(b.kind) || a.value.localeCompare(b.value),
    ),
  tokens: tokens.sort((a, b) => a.name.localeCompare(b.name)),
  components: components.sort((a, b) => a.name.localeCompare(b.name)),
};

writeFileSync(OUT, `${JSON.stringify(bucket, null, 2)}\n`);

const byKind = bucket.values.reduce((acc, row) => {
  acc[row.kind] = (acc[row.kind] ?? 0) + 1;
  return acc;
}, {});

console.error(
  JSON.stringify(
    {
      values: bucket.values.length,
      values_by_kind: byKind,
      tokens: bucket.tokens.length,
      unresolved_tokens: unresolvedTokens.size,
      components: bucket.components.length,
      out: OUT,
    },
    null,
    2,
  ),
);
