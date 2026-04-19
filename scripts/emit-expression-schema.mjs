#!/usr/bin/env node
/**
 * Emit schemas/expression.schema.json from the zod source of truth.
 * Run after changes to packages/ghost-core/src/expression/schema.ts:
 *
 *   pnpm --filter @ghost/core build && node scripts/emit-expression-schema.mjs
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const { toJsonSchema } = await import(
  resolve(root, "packages/ghost-core/dist/expression/schema.js")
);

const schema = toJsonSchema();
schema.title = "Ghost Expression Frontmatter";
schema.description =
  "Schema for YAML frontmatter in Ghost expression.md files (schema version 2).";

const outDir = resolve(root, "schemas");
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
const outPath = resolve(outDir, "expression.schema.json");
writeFileSync(outPath, `${JSON.stringify(schema, null, 2)}\n`);
console.log(`Wrote ${outPath}`);
