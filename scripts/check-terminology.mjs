import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOTS = [
  "README.md",
  "CLAUDE.md",
  "docs",
  "apps",
  "packages/ghost/src",
  "packages/ghost/test",
  "packages/ghost-core/src",
  "packages/ghost-core/test",
  ".ghost",
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
  "--memory-dir",
  "--include-memory",
  "missing-memory",
  "product-experience memory",
  "memory for agents",
  "muscle memory",
  "in-memory",
];

const forbiddenPatterns = FORBIDDEN_PHRASES.map((phrase) => ({
  phrase,
  pattern: new RegExp(escapeRegExp(phrase), "i"),
})).concat(FORBIDDEN_PATTERNS);

const violations = [];

for (const root of ROOTS) {
  for (const file of collectFiles(root)) {
    if (EXCLUDED_PATHS.has(file)) continue;
    const content = readFileSync(file, "utf8");
    const lines = content.split("\n");
    lines.forEach((line, index) => {
      for (const { phrase, pattern } of forbiddenPatterns) {
        if (!pattern.test(line)) continue;
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
