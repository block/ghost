import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const DEFAULT_LIMIT = 500;

// Add narrowly scoped exceptions here with justification
const EXCEPTIONS = {
  "packages/ghost/src/ghost-core/types.ts": {
    limit: 780,
    justification:
      "Canonical type barrel — all shared types in one file for discoverability, including three-layer fingerprint types and role bindings",
  },
  "packages/ghost/src/cli.ts": {
    limit: 580,
    justification:
      "Unified CLI command registry — review/check/compare plus drift stance verbs live together for one public bin",
  },
  "packages/ghost/src/scan-commands.ts": {
    limit: 1120,
    justification:
      "Scan and fingerprint bundle command registry — temporarily holds legacy markdown, fingerprint.yml package verbs, and adapter-neutral memory-dir routing until the command registry is split",
  },
  "packages/ghost/src/scan/inventory.ts": {
    limit: 1120,
    justification:
      "Deterministic repository inventory collector — intentionally broad because map authoring depends on one cohesive raw signal pass",
  },
  "packages/ghost/src/scan/memory-stack.ts": {
    limit: 1120,
    justification:
      "Canonical nested memory stack loader — discovery, merge, path normalization, memory-dir validation, and stack validation stay together so CLI routing shares one provenance model",
  },
  "packages/ghost/src/scan/verify-fingerprint.ts": {
    limit: 900,
    justification:
      "Fingerprint fidelity verifier — schema, reference, and survey evidence checks stay together so reports share one issue model",
  },
  "packages/ghost/src/ghost-core/embedding/compare.ts": {
    limit: 600,
    justification:
      "Fingerprint comparison — cosine-based decision matching alongside existing value comparison",
  },
};

const DIRS_TO_CHECK = [{ dir: "packages/ghost/src", glob: /\.[jt]sx?$/ }];

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
