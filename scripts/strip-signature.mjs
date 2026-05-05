#!/usr/bin/env node
// One-shot script: remove `# Signature` body blocks from a list of
// expression.md files. The block runs from the `# Signature` line up to
// (but not including) the next H1 heading or EOF. Idempotent.
import { readFileSync, writeFileSync } from "node:fs";

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("usage: strip-signature.mjs <file>...");
  process.exit(2);
}

let touched = 0;
for (const f of files) {
  const raw = readFileSync(f, "utf8");
  const lines = raw.split("\n");
  const out = [];
  let inSig = false;
  for (const line of lines) {
    if (/^# Signature\s*$/.test(line)) {
      inSig = true;
      continue;
    }
    if (inSig && /^# /.test(line)) {
      inSig = false;
    }
    if (!inSig) out.push(line);
  }
  const next = out.join("\n").replace(/\n{3,}/g, "\n\n");
  if (next !== raw) {
    writeFileSync(f, next, "utf8");
    touched++;
    console.log(`stripped: ${f}`);
  } else {
    console.log(`unchanged: ${f}`);
  }
}
console.log(`${touched}/${files.length} files modified`);
