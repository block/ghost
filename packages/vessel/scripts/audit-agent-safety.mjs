import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const sourceRoot = path.join(packageRoot, "src");
const strict = process.argv.includes("--strict");

const requiredAgentDecisionItems = [
  "button",
  "card",
  "badge",
  "input",
  "dialog",
  "popover",
  "command",
  "message",
  "tool",
  "reasoning",
  "code-block",
  "terminal",
  "prompt-input",
  "surface",
  "stack",
  "text",
];

const deprecatedTokenFamilies = [
  ["background-default", "bg-background / --background"],
  ["background-alt", "bg-accent / --accent"],
  ["background-medium", "bg-secondary / --secondary"],
  ["background-muted", "bg-muted / --muted"],
  ["background-inverse", "bg-primary / --primary, when truly inverse"],
  ["background-danger", "bg-destructive / --destructive"],
  ["background-success", "text-success or a future status token"],
  ["background-info", "text-info or a future status token"],
  ["background-warning", "text-warning or a future status token"],
  ["text-default", "text-foreground / --foreground"],
  ["text-muted", "text-muted-foreground / --muted-foreground"],
  ["text-alt", "text-muted-foreground / --muted-foreground"],
  ["text-inverse", "text-primary-foreground / --primary-foreground"],
  ["text-danger", "text-destructive / --destructive"],
  ["border-default", "border-border / --border"],
  ["border-strong", "border-border or ring-ring, depending on job"],
  ["border-card", "border-border / --border"],
  ["surface-card", "bg-card / --card"],
];

const rawPaletteUtilityPattern =
  /\b(?:[a-z-]+:|\[[^\]]+\]:)*(?:bg|border|text|ring|fill|stroke)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}(?:\/\d{1,3})?\b/g;

const arbitraryColorPattern =
  /\b(?:[a-z-]+:|\[[^\]]+\]:)*(?:bg|border|text|ring|fill|stroke)-\[(?:#|rgb|hsl|oklch|color-mix)[^\]]*\]/g;

const allowedRawPaletteFiles = new Set([
  "src/styles/main.css",
  "src/lib/theme-presets.ts",
  "src/lib/theme-defaults.ts",
]);

function listFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "dist" || entry.name === "dist-lib") return [];
      return listFiles(entryPath);
    }

    return /\.(?:ts|tsx|css)$/.test(entry.name) ? [entryPath] : [];
  });
}

function lineNumber(source, index) {
  return source.slice(0, index).split("\n").length;
}

function collectMatches(source, relativePath) {
  const findings = [];
  const isAllowedRawPaletteFile = allowedRawPaletteFiles.has(relativePath);

  for (const [token, replacement] of deprecatedTokenFamilies) {
    const pattern = new RegExp(
      `(?<![A-Za-z0-9-])${token}(?![A-Za-z0-9-])`,
      "g",
    );
    for (const match of source.matchAll(pattern)) {
      findings.push({
        kind: "deprecated-token-family",
        source: relativePath,
        line: lineNumber(source, match.index ?? 0),
        value: token,
        hint: `Prefer ${replacement}.`,
      });
    }
  }

  if (!isAllowedRawPaletteFile) {
    for (const match of source.matchAll(rawPaletteUtilityPattern)) {
      findings.push({
        kind: "raw-palette-utility",
        source: relativePath,
        line: lineNumber(source, match.index ?? 0),
        value: match[0],
        hint: "Prefer shadcn semantic utilities (bg-accent, text-foreground, border-border) or a narrow Vessel extension token.",
      });
    }

    for (const match of source.matchAll(arbitraryColorPattern)) {
      findings.push({
        kind: "arbitrary-color-utility",
        source: relativePath,
        line: lineNumber(source, match.index ?? 0),
        value: match[0],
        hint: "Move repeated color decisions into a named token or component variant.",
      });
    }
  }

  return findings;
}

const findings = listFiles(sourceRoot).flatMap((file) => {
  const relativePath = path.relative(packageRoot, file);
  const source = fs.readFileSync(file, "utf8");
  return collectMatches(source, relativePath);
});

const registry = JSON.parse(
  fs.readFileSync(path.join(packageRoot, "registry.json"), "utf8"),
);
const registryItemsByName = new Map(
  registry.items.map((item) => [item.name, item]),
);

for (const name of requiredAgentDecisionItems) {
  const item = registryItemsByName.get(name);
  if (!item?.meta?.agent_decision?.intent) {
    findings.push({
      kind: "missing-agent-decision",
      source: "registry.json",
      line: 1,
      value: name,
      hint: "Add meta.agent_decision with intent, usage guidance, common misuses, and token roles.",
    });
  }
}

const byKind = findings.reduce((acc, finding) => {
  acc[finding.kind] = (acc[finding.kind] ?? 0) + 1;
  return acc;
}, {});

console.log("Vessel agent-safety audit");
console.log("===========================");
console.log(`Mode: ${strict ? "strict" : "report-only"}`);
console.log(`Findings: ${findings.length}`);
for (const [kind, count] of Object.entries(byKind).sort()) {
  console.log(`- ${kind}: ${count}`);
}

if (findings.length > 0) {
  console.log("\nFirst 80 findings:");
  for (const finding of findings.slice(0, 80)) {
    console.log(
      `${finding.source}:${finding.line} [${finding.kind}] ${finding.value} — ${finding.hint}`,
    );
  }

  if (findings.length > 80) {
    console.log(`... ${findings.length - 80} more findings omitted`);
  }
}

if (strict && findings.length > 0) {
  process.exitCode = 1;
}
