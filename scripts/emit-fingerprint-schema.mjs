#!/usr/bin/env node
/**
 * Emit schemas/fingerprint.schema.json from the zod source of truth.
 * Run after changes to packages/ghost-drift/src/core/fingerprint/schema.ts:
 *
 *   pnpm --filter ghost-drift build && node scripts/emit-fingerprint-schema.mjs
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const { toJsonSchema } = await import(
  resolve(root, "packages/ghost-drift/dist/core/fingerprint/schema.js")
);

const schema = toJsonSchema();
schema.title = "Ghost Fingerprint Frontmatter";
schema.description =
  "Schema for YAML frontmatter in Ghost fingerprint.md files.";

const outDir = resolve(root, "schemas");
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
const outPath = resolve(outDir, "fingerprint.schema.json");
writeFileSync(outPath, `${JSON.stringify(schema, null, 2)}\n`);
console.log(`Wrote ${outPath}`);
