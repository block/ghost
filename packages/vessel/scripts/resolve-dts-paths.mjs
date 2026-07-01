#!/usr/bin/env node
/**
 * Post-process dist-lib/**.d.ts files to replace `@/` path aliases with
 * real relative paths. tsc leaves the aliases verbatim; consumers can't
 * resolve them because they don't have the same tsconfig `paths`.
 *
 * Tiny in-tree alternative to the `tsc-alias` npm package (which we can't
 * reliably install through the Block artifactory right now).
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_LIB = resolve(__dirname, "..", "dist-lib");
const SRC_ROOT = resolve(__dirname, "..", "src");

async function walkDts(dir) {
  const out = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walkDts(full)));
    } else if (entry.name.endsWith(".d.ts")) {
      out.push(full);
    }
  }
  return out;
}

function resolveAlias(fromFile, importPath) {
  // "@/components/ui/button" → absolute path under SRC_ROOT, then relative
  // from the file's location in dist-lib (mirrors src/ layout).
  const targetUnderSrc = importPath.replace(/^@\//, `${SRC_ROOT}/`);
  const fileDir = dirname(fromFile).replace(DIST_LIB, SRC_ROOT);
  let rel = relative(fileDir, targetUnderSrc);
  if (!rel.startsWith(".")) rel = `./${rel}`;
  return rel;
}

async function rewriteFile(file) {
  const content = await readFile(file, "utf-8");
  const next = content.replace(
    /from\s+["'](@\/[^"']+)["']/g,
    (_, spec) => `from "${resolveAlias(file, spec)}"`,
  );
  if (next !== content) {
    await writeFile(file, next, "utf-8");
    return true;
  }
  return false;
}

async function main() {
  const files = await walkDts(DIST_LIB);
  let rewritten = 0;
  for (const file of files) {
    if (await rewriteFile(file)) rewritten++;
  }
  console.log(`resolve-dts-paths: rewrote ${rewritten}/${files.length} files`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
