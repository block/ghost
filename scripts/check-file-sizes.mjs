import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const DEFAULT_LIMIT = 500;

// Add narrowly scoped exceptions here with justification
const EXCEPTIONS = {
  "packages/ghost-core/src/types.ts": {
    limit: 700,
    justification: "Canonical type barrel — all shared types in one file for discoverability",
  },
  "packages/ghost-cli/src/bin.ts": {
    limit: 520,
    justification: "CLI command registry — each command is small but there are 12 of them",
  },
};

const DIRS_TO_CHECK = [
  { dir: "packages/ghost-core/src", glob: /\.[jt]sx?$/ },
  { dir: "packages/ghost-cli/src", glob: /\.[jt]sx?$/ },
];

function countLines(filePath) {
  const content = readFileSync(filePath, "utf8");
  return content.split("\n").length;
}

function walkDir(dir, pattern) {
  const results = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath, pattern));
    } else if (pattern.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

const violations = [];

for (const { dir, glob } of DIRS_TO_CHECK) {
  const files = walkDir(dir, glob);
  for (const file of files) {
    const rel = relative(".", file);
    const limit = EXCEPTIONS[rel]?.limit ?? DEFAULT_LIMIT;
    const lines = countLines(file);
    if (lines > limit) {
      violations.push({ file: rel, lines, limit });
    }
  }
}

if (violations.length > 0) {
  console.error("File size check failed:");
  for (const v of violations) {
    console.error(`  - ${v.file}: ${v.lines} lines (limit ${v.limit})`);
  }
  console.error(
    "\nSplit the file or add a narrowly scoped exception in `scripts/check-file-sizes.mjs`.",
  );
  process.exit(1);
} else {
  console.log("File size check passed.");
}
