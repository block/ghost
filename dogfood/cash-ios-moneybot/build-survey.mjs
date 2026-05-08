#!/usr/bin/env node
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";

const TARGET_ROOT =
  "/Users/nahiyan/Development/cash-ios/Code/Features/Moneybot";
const OUT =
  "/Users/nahiyan/Development/ghost/dogfood/cash-ios-moneybot/survey.json";

const SOURCE = {
  id: "moneybot",
  role: "primary",
  target: "squareup/cash-ios/Code/Features/Moneybot",
  commit: "9dce179a54f",
  scanned_at: "2026-05-04T00:00:00Z",
  scanner_version: "dogfood-cash-ios-moneybot-1",
};

const SOURCES = [
  SOURCE,
  {
    id: "arcade",
    role: "resolver",
    target: "squareup/cash-ios/Code/DesignSystem/Arcade",
    commit: "9dce179a54f",
    scanned_at: SOURCE.scanned_at,
    scanner_version: SOURCE.scanner_version,
    resolves: ["color", "spacing", "typography", "radius", "components"],
  },
  {
    id: "arcade-swiftui",
    role: "resolver",
    target: "squareup/cash-ios/Code/DesignSystem/ArcadeSwiftUI",
    commit: "9dce179a54f",
    scanned_at: SOURCE.scanned_at,
    scanner_version: SOURCE.scanner_version,
    resolves: ["swiftui-components", "typography", "spacing", "interaction"],
  },
  {
    id: "arcade-tokens",
    role: "resolver",
    target: "@swiftpkg_cash_arcade_tokens_spm//:ArcadeTokens",
    scanned_at: SOURCE.scanned_at,
    scanner_version: SOURCE.scanner_version,
    resolves: ["color", "spacing", "typography", "radius", "haptics"],
  },
];

const EXCLUDE_PARTS = [
  "/Fakes/",
  "Fakes/",
  "/DevApp/",
  "/UnitTests/",
  "/Networking/Proto/",
  "/Sources/Resources/en.lproj/",
];

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const rel = `/${relative(TARGET_ROOT, path)}`;
    if (EXCLUDE_PARTS.some((part) => rel.includes(part))) continue;
    const stat = statSync(path);
    if (stat.isDirectory()) {
      walk(path, acc);
    } else if (/\.(swift|metal|json)$/.test(entry)) {
      acc.push(path);
    }
  }
  return acc;
}

const files = walk(TARGET_ROOT).sort();
const swiftFiles = files.filter((file) => file.endsWith(".swift"));
const sourceSwiftFiles = swiftFiles.filter((file) =>
  relative(TARGET_ROOT, file).includes("/Sources/"),
);

const texts = new Map(files.map((file) => [file, readFileSync(file, "utf8")]));

function rel(path) {
  return relative(TARGET_ROOT, path);
}

function addCount(map, key, raw, file, inc = 1) {
  const row = map.get(key) ?? { raw, occurrences: 0, files: new Set() };
  row.occurrences += inc;
  row.files.add(file);
  map.set(key, row);
}

function normalizeHex(hex) {
  return `#${hex.replace(/^#/, "").toLowerCase()}`;
}

function hexFrom255(parts) {
  const channels = parts.map((part) => {
    const [num, den] = part.split("/").map((value) => Number(value.trim()));
    const value = den ? Math.round((num / den) * 255) : Math.round(num);
    return value.toString(16).padStart(2, "0");
  });
  return `#${channels.join("")}`;
}

function colorSpec(hex) {
  if (hex === "transparent") {
    return { space: "srgb", rgb: { r: 0, g: 0, b: 0, a: 0 } };
  }
  const clean = hex.replace("#", "");
  const r = Number.parseInt(clean.slice(0, 2), 16);
  const g = Number.parseInt(clean.slice(2, 4), 16);
  const b = Number.parseInt(clean.slice(4, 6), 16);
  return { space: "srgb", hex, rgb: { r, g, b } };
}

function roleForColor(hex) {
  const roles = {
    "#101010": "moneybot-card-dark",
    "#fcfcfc": "moneybot-elevated-light",
    "#e8e8e8": "avatar-background-light",
    "#232323": "avatar-background-dark",
    "#666666": "avatar-tint-light",
    "#878787": "avatar-tint-dark",
    "#ffffff": "canvas-foreground",
    "#000000": "canvas-background",
    transparent: "clear-layer",
  };
  return roles[hex];
}

const valueRows = [];
const tokenRows = [];
const componentRows = [];

const colorBuckets = new Map();
for (const [file, text] of texts) {
  if (!file.endsWith(".swift")) continue;

  for (const match of text.matchAll(/#([0-9a-fA-F]{6})/g)) {
    addCount(colorBuckets, normalizeHex(match[1]), match[0], file);
  }
  for (const match of text.matchAll(/\.srgb\s*=\s*"([0-9a-fA-F]{6})"/g)) {
    addCount(colorBuckets, normalizeHex(match[1]), match[0], file);
  }
  for (const match of text.matchAll(
    /Color\(red:\s*([0-9 ]+\/\s*255),\s*green:\s*([0-9 ]+\/\s*255),\s*blue:\s*([0-9 ]+\/\s*255)\)/g,
  )) {
    addCount(
      colorBuckets,
      hexFrom255([match[1], match[2], match[3]]),
      match[0],
      file,
    );
  }
  for (const match of text.matchAll(
    /\b(Color|UIColor)\.(black|white|clear)\b/g,
  )) {
    const named = {
      black: "#000000",
      white: "#ffffff",
      clear: "transparent",
    }[match[2]];
    addCount(colorBuckets, named, match[0], file);
  }
}

for (const [value, bucket] of [...colorBuckets.entries()].sort()) {
  valueRows.push({
    id: "",
    source: SOURCE,
    kind: "color",
    value,
    raw: bucket.raw,
    spec: colorSpec(value),
    occurrences: bucket.occurrences,
    files_count: bucket.files.size,
    usage: { swift_literal: bucket.occurrences },
    role_hypothesis: roleForColor(value),
  });
}

const numberBuckets = new Map();
const numberContexts = [
  /(?:spacing|width|height|cornerRadius|radius|padding|offset|blur|lineSpacing|kerning|size|lineHeight|cardWidth|margin|verticalSpacing|horizontalSpacing|MaxWidth|MinWidth)\s*[:=]\s*(-?\d+(?:\.\d+)?)/g,
  /\.(?:padding|frame|cornerRadius|offset|blur|lineSpacing|kerning)\([^)\n]*?(-?\d+(?:\.\d+)?)/g,
  /CGSize\(width:\s*(-?\d+(?:\.\d+)?),\s*height:\s*(-?\d+(?:\.\d+)?)\)/g,
  /CGRect\(x:\s*(-?\d+(?:\.\d+)?),\s*y:\s*(-?\d+(?:\.\d+)?),\s*width:\s*(-?\d+(?:\.\d+)?),\s*height:\s*(-?\d+(?:\.\d+)?)\)/g,
];

for (const [file, text] of texts) {
  if (!file.endsWith(".swift")) continue;
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (
      !/(spacing|padding|frame|cornerRadius|radius|offset|blur|lineSpacing|kerning|font|size|height|width|margin|card|clipShape|RoundedRectangle)/.test(
        line,
      )
    ) {
      continue;
    }
    for (const regex of numberContexts) {
      for (const match of line.matchAll(regex)) {
        for (let i = 1; i < match.length; i++) {
          if (match[i] === undefined) continue;
          const n = Number(match[i]);
          if (!Number.isFinite(n)) continue;
          if (!Number.isInteger(n)) continue;
          if (Math.abs(n) > 480) continue;
          addCount(numberBuckets, `${n}px`, match[0], file);
        }
      }
    }
  }
}

for (const [value, bucket] of [...numberBuckets.entries()].sort(
  (a, b) => Number.parseFloat(a[0]) - Number.parseFloat(b[0]),
)) {
  const n = Number.parseFloat(value);
  valueRows.push({
    id: "",
    source: SOURCE,
    kind: "spacing",
    value,
    raw: bucket.raw,
    spec: { scalar: n, unit: "px" },
    occurrences: bucket.occurrences,
    files_count: bucket.files.size,
    usage: { swift_ui_layout_literal: bucket.occurrences },
  });
}

const radiusBuckets = new Map();
for (const [file, text] of texts) {
  if (!file.endsWith(".swift")) continue;
  for (const match of text.matchAll(
    /(?:cornerRadius|radius)\s*(?::\s*(?:CGFloat|Double|Float|Int))?\s*[=:]\s*(\d+(?:\.\d+)?)/g,
  )) {
    addCount(radiusBuckets, `${Number(match[1])}px`, match[0], file);
  }
  for (const match of text.matchAll(
    /\.Arcade\.CornerRadius\.([A-Za-z0-9_]+)/g,
  )) {
    addCount(radiusBuckets, `.Arcade.CornerRadius.${match[1]}`, match[0], file);
  }
}

for (const [value, bucket] of [...radiusBuckets.entries()].sort()) {
  const numeric = Number.parseFloat(value);
  valueRows.push({
    id: "",
    source: SOURCE,
    kind: "radius",
    value,
    raw: bucket.raw,
    spec: Number.isFinite(numeric)
      ? { scalar: numeric, unit: "px" }
      : { raw: value },
    occurrences: bucket.occurrences,
    files_count: bucket.files.size,
    usage: { swift_shape: bucket.occurrences },
    resolution: value.startsWith(".Arcade.")
      ? {
          status: "unresolved-external",
          source_id: "arcade-tokens",
          target: "@swiftpkg_cash_arcade_tokens_spm//:ArcadeTokens",
          symbol: value,
          chain: [value],
        }
      : undefined,
  });
}

const typeBuckets = new Map();
for (const [file, text] of texts) {
  if (!file.endsWith(".swift")) continue;
  for (const match of text.matchAll(/ArcadeTextStyle\.([A-Za-z0-9_]+)/g)) {
    addCount(typeBuckets, `ArcadeTextStyle.${match[1]}`, match[0], file);
  }
  for (const match of text.matchAll(/\.font\(\.Arcade\.([A-Za-z0-9_]+)\)/g)) {
    addCount(typeBuckets, `.font(.Arcade.${match[1]})`, match[0], file);
  }
  for (const match of text.matchAll(
    /monospacedSystemFont\(ofSize:\s*(\d+(?:\.\d+)?),\s*weight:\s*\.([A-Za-z0-9_]+)/g,
  )) {
    addCount(typeBuckets, `${match[1]}px-${match[2]}`, match[0], file);
  }
}

for (const [value, bucket] of [...typeBuckets.entries()].sort()) {
  const size = value.match(/^(\d+(?:\.\d+)?)px-/);
  const weight = value.match(/px-([A-Za-z0-9_]+)$/);
  valueRows.push({
    id: "",
    source: SOURCE,
    kind: "typography",
    value,
    raw: bucket.raw,
    spec: size
      ? {
          family: "monospacedSystem",
          size: { scalar: Number(size[1]), unit: "px" },
          weight: weight?.[1] === "bold" ? 700 : weight?.[1],
        }
      : { family: "ArcadeTextStyle" },
    occurrences: bucket.occurrences,
    files_count: bucket.files.size,
    usage: { swift_text_style: bucket.occurrences },
    resolution:
      value.startsWith("ArcadeTextStyle") || value.startsWith(".font")
        ? {
            status: "unresolved-external",
            source_id: "arcade-tokens",
            target: "@swiftpkg_cash_arcade_tokens_spm//:ArcadeTokens",
            symbol: value,
            chain: [value],
          }
        : undefined,
  });
}

const motionBuckets = new Map();
for (const [file, text] of texts) {
  if (!file.endsWith(".swift")) continue;
  for (const match of text.matchAll(
    /\.ease(?:InOut|In|Out)?\(duration:\s*(\d+(?:\.\d+)?)/g,
  )) {
    addCount(motionBuckets, `${Number(match[1]) * 1000}ms`, match[0], file);
  }
  for (const match of text.matchAll(
    /\.Arcade\.Spring\.Smooth\.([A-Za-z0-9_]+)/g,
  )) {
    addCount(
      motionBuckets,
      `.Arcade.Spring.Smooth.${match[1]}`,
      match[0],
      file,
    );
  }
}

for (const [value, bucket] of [...motionBuckets.entries()].sort()) {
  const ms = Number.parseFloat(value);
  valueRows.push({
    id: "",
    source: SOURCE,
    kind: "motion",
    value,
    raw: bucket.raw,
    spec: Number.isFinite(ms) ? { duration_ms: ms } : { easing: value },
    occurrences: bucket.occurrences,
    files_count: bucket.files.size,
    usage: { swift_animation: bucket.occurrences },
    resolution: value.startsWith(".Arcade.")
      ? {
          status: "unresolved-external",
          source_id: "arcade-tokens",
          target: "@swiftpkg_cash_arcade_tokens_spm//:ArcadeTokens",
          symbol: value,
          chain: [value],
        }
      : undefined,
  });
}

const tokenCounts = new Map();
for (const [file, text] of texts) {
  if (!file.endsWith(".swift")) continue;

  for (const match of text.matchAll(/\.Arcade(?:\.[A-Za-z][A-Za-z0-9_]*)+/g)) {
    const symbol = match[0].replace(/\.opacity$/, "");
    addCount(tokenCounts, symbol, match[0], file);
  }
  for (const match of text.matchAll(/ArcadeTextStyle\.([A-Za-z0-9_]+)/g)) {
    addCount(tokenCounts, `ArcadeTextStyle.${match[1]}`, match[0], file);
  }
  for (const match of text.matchAll(
    /Color\.MoneybotUI\.([A-Za-z0-9_]+)(\s*\()?/g,
  )) {
    const base = match[1];
    const isCall = Boolean(match[2]);
    const signature =
      base === "card" && isCall
        ? "card(for:)"
        : base === "ElevatedBackground"
          ? "ElevatedBackground(for:)"
          : base === "ElevatedBackgroundPressed"
            ? "ElevatedBackgroundPressed(for:)"
            : base;
    addCount(tokenCounts, `Color.MoneybotUI.${signature}`, match[0], file);
  }
  for (const match of text.matchAll(/\.font\(\.Arcade\.([A-Za-z0-9_]+)\)/g)) {
    addCount(tokenCounts, `.font(.Arcade.${match[1]})`, match[0], file);
  }
}

function classifyToken(name) {
  if (name.includes(".CornerRadius.")) return "radius";
  if (
    name.includes(".Semantic.") ||
    name.includes(".Component.") ||
    name.includes(".Data.")
  ) {
    return "color";
  }
  if (name.includes(".Base.")) return "color";
  if (
    /\.Arcade\.(body|label|headline|pageTitle|input)[A-Za-z0-9_.]*/.test(name)
  ) {
    return "typography";
  }
  if (
    /\.(xsmall|small|medium|large|xlarge|margin)$/.test(name) ||
    name.includes(".Border.")
  ) {
    return "spacing";
  }
  if (name.startsWith("ArcadeTextStyle") || name.startsWith(".font(")) {
    return "typography";
  }
  if (name.includes(".Spring.")) return "motion";
  if (name.startsWith("Color.MoneybotUI")) return "color";
  if (name.includes("Haptics")) return "motion";
  return "icon-or-component";
}

function resolvedTokenValue(name) {
  if (name === "Color.MoneybotUI.card") return "#101010";
  if (name === "Color.MoneybotUI.card(for:)") {
    return "light:.Arcade.Semantic.Background.subtle dark:#101010 default:.Arcade.Semantic.Background.subtle";
  }
  if (name === "Color.MoneybotUI.ElevatedBackground(for:)") {
    return "light:#fcfcfc dark:.Arcade.Semantic.Background.standard default:.Arcade.Semantic.Background.app";
  }
  if (name === "Color.MoneybotUI.ElevatedBackgroundPressed(for:)") {
    return "light:.Arcade.Semantic.Background.subtle dark:.Arcade.Semantic.Background.prominent default:.Arcade.Semantic.Background.app";
  }
  return "unresolved-external";
}

for (const [name, bucket] of [...tokenCounts.entries()].sort()) {
  const local = name.startsWith("Color.MoneybotUI");
  const token = {
    id: "",
    source: SOURCE,
    name,
    alias_chain: local ? [name] : [name],
    resolved_value: resolvedTokenValue(name),
    occurrences: bucket.occurrences,
    kind: classifyToken(name),
    files_count: bucket.files.size,
  };
  if (name === "Color.MoneybotUI.card") {
    token.resolution = {
      status: "resolved",
      source_id: "moneybot",
      target: SOURCE.target,
      symbol: name,
      chain: [name, "#101010"],
    };
  } else if (local) {
    token.resolution = {
      status: "resolved",
      source_id: "moneybot",
      target: SOURCE.target,
      symbol: name,
      chain: [name],
    };
  } else {
    token.resolution = {
      status: "unresolved-external",
      source_id: "arcade-tokens",
      target: "@swiftpkg_cash_arcade_tokens_spm//:ArcadeTokens",
      symbol: name,
      chain: [name],
      message:
        "ArcadeTokens is resolved through Bazel external @swiftpkg_cash_arcade_tokens_spm and is not present as local source in this checkout.",
    };
  }
  tokenRows.push(token);
}

const componentNames = new Map();
for (const file of sourceSwiftFiles) {
  const text = texts.get(file);
  for (const match of text.matchAll(
    /(?:public\s+|private\s+|final\s+|@MainActor\s+|struct\s+|class\s+|enum\s+)*\b(struct|final class|class)\s+([A-Z][A-Za-z0-9_]*(?:View|Cell|Card|Button|Label|Composer|Header|Chart|Graph|Ring|Sheet|Menu|Bar|Renderer|Factory|Modifier|Style|Model))\b/g,
  )) {
    const name = match[2];
    if (name.endsWith("Model") || name.endsWith("Factory")) continue;
    const slot = componentNames.get(name) ?? {
      files: new Set(),
      kind: match[1],
    };
    slot.files.add(file);
    componentNames.set(name, slot);
  }
}

for (const [name, slot] of [...componentNames.entries()].sort()) {
  const firstPath = [...slot.files][0];
  const variants = [];
  if (name.includes("Card")) variants.push("card");
  if (name.includes("Chart") || name.includes("Graph")) variants.push("chart");
  if (name.includes("Composer")) variants.push("composer");
  if (name.includes("EmptyState")) variants.push("empty-state");
  if (name.includes("Canvas")) variants.push("canvas");
  componentRows.push({
    id: "",
    source: SOURCE,
    name,
    discovered_via: "Swift UI type heuristic",
    variants,
    paths: [...slot.files].map(rel).sort(),
    module: dirname(rel(firstPath)).split("/").slice(0, 2).join("/"),
  });
}

const survey = {
  schema: "ghost.survey/v1",
  sources: SOURCES,
  values: valueRows.sort((a, b) =>
    `${a.kind}:${a.value}:${a.raw}`.localeCompare(
      `${b.kind}:${b.value}:${b.raw}`,
    ),
  ),
  tokens: tokenRows,
  components: componentRows,
};

writeFileSync(OUT, `${JSON.stringify(survey, null, 2)}\n`);
console.log(
  JSON.stringify(
    {
      out: OUT,
      files: files.length,
      swift_files: swiftFiles.length,
      values: survey.values.length,
      tokens: survey.tokens.length,
      components: survey.components.length,
    },
    null,
    2,
  ),
);
