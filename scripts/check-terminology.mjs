import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOTS = [
  "README.md",
  "CLAUDE.md",
  "CONTRIBUTING.md",
  "package.json",
  "docs",
  "apps",
  "install",
  "packages/ghost/README.md",
  "packages/ghost/package.json",
  "packages/ghost/src",
  "packages/ghost/test",
  "packages/vessel-react/README.md",
  ".changeset",
];

const FILE_EXTENSIONS = new Set([
  ".js",
  ".json",
  ".md",
  ".mdx",
  ".mjs",
  ".ts",
  ".tsx",
  ".yml",
  ".yaml",
]);

const EXCLUDED_PATHS = new Set(["scripts/check-terminology.mjs"]);

const FORBIDDEN_PHRASES = [
  "memory stack",
  "memory bundle",
  "memory skeleton",
  "memory readiness",
  "memory format",
  "memory refs",
  "memory claim",
  "memory lifecycle",
  "memory authoring",
  "memory edits",
  "memory changes",
  "memory updates",
  "fingerprint memory",
  "canonical memory",
  "checked-in memory",
  "repo memory",
  "scoped-memory",
  "custom memory directories",
  "inventory cache",
  "generated inventory",
  "product-experience",
  "product experience",
  "product judgment",
  "product identity",
  "experience identity",
  "product memory",
  "experience memory",
  "world model",
  "memory for agents",
  "judgment",
  "judgement",
  "judging",
  "judged",
];

/**
 * Entrance docs hold a stricter bar: implementation vocabulary that is fine in
 * contributor docs and reference pages must not leak into the welcome path.
 * Say "materials", "paths or URLs", "private local log", "before you build /
 * when you review" instead.
 */
const ENTRANCE_DOCS = new Set([
  "README.md",
  "packages/ghost/README.md",
  "apps/docs/src/content/docs/quickstart.mdx",
  "apps/docs/src/content/docs/getting-started.mdx",
]);

const ENTRANCE_FORBIDDEN_PHRASES = [
  "JSONL",
  "gitignored",
  "events tape",
  "feed-forward",
  "feed-back",
  "locator",
  "corpus",
  "deterministic",
];

const DISALLOWED_VERSION_MARKER = `${"v"}${"2"}`;

const FORBIDDEN_PATTERNS = [
  {
    phrase: "future version marker",
    pattern: new RegExp(
      `(^|[^A-Za-z0-9])${DISALLOWED_VERSION_MARKER}([^A-Za-z0-9]|$)|/${DISALLOWED_VERSION_MARKER}\\b`,
      "i",
    ),
  },
];

const ALLOWED_MEMORY_TERMS = [
  "--include-memory",
  "missing-memory",
  "muscle memory",
  "in-memory",
  "fingerprint/memory/intent.md",
  "fingerprint/memory/decisions",
  "memory/intent.md",
  "memory/decisions",
];

const ALLOWED_VERSION_MARKERS = ["ghost.relay.gather/v2"];

const forbiddenPatterns = FORBIDDEN_PHRASES.map((phrase) => ({
  phrase,
  pattern: new RegExp(escapeRegExp(phrase), "i"),
})).concat(FORBIDDEN_PATTERNS);

const entranceForbiddenPatterns = ENTRANCE_FORBIDDEN_PHRASES.map((phrase) => ({
  phrase: `${phrase} (entrance docs)`,
  pattern: new RegExp(escapeRegExp(phrase), "i"),
}));

const violations = [];

for (const root of ROOTS) {
  for (const file of collectFiles(root)) {
    if (EXCLUDED_PATHS.has(file)) continue;
    const content = readFileSync(file, "utf8");
    const lines = content.split("\n");
    const patterns = ENTRANCE_DOCS.has(file)
      ? forbiddenPatterns.concat(entranceForbiddenPatterns)
      : forbiddenPatterns;
    lines.forEach((line, index) => {
      for (const { phrase, pattern } of patterns) {
        if (!pattern.test(line)) continue;
        if (isAllowedTerminologyUse(line, phrase)) continue;
        violations.push({
          file,
          line: index + 1,
          phrase,
          text: line.trim(),
        });
      }
    });
  }
}

if (violations.length > 0) {
  console.error("Terminology check failed:");
  for (const violation of violations) {
    console.error(
      `  - ${violation.file}:${violation.line} contains '${violation.phrase}': ${violation.text}`,
    );
  }
  console.error(
    `\nAllowed memory terms are: ${ALLOWED_MEMORY_TERMS.map((term) => `'${term}'`).join(", ")}`,
  );
  process.exit(1);
}

console.log("Terminology check passed.");

function isAllowedTerminologyUse(line, phrase) {
  if (phrase === "future version marker") {
    return ALLOWED_VERSION_MARKERS.some((marker) => line.includes(marker));
  }
  return false;
}

function collectFiles(path) {
  const results = [];
  let info;
  try {
    info = statSync(path);
  } catch {
    return results;
  }

  if (info.isDirectory()) {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === "dist") continue;
      results.push(...collectFiles(join(path, entry.name)));
    }
    return results;
  }

  if (!info.isFile()) return results;
  if (!FILE_EXTENSIONS.has(extensionFor(path))) return results;
  results.push(relative(".", path));
  return results;
}

function extensionFor(path) {
  const lastDot = path.lastIndexOf(".");
  return lastDot === -1 ? "" : path.slice(lastDot);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
