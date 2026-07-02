#!/usr/bin/env node
import { mkdirSync, rmSync, symlinkSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PACKAGE_ROOT = resolve(ROOT, "packages/ghost");
const BIN_DIR = resolve(PACKAGE_ROOT, "node_modules/.bin");
const BIN_NAMES = ["ghost", "ghost-fingerprint"];

mkdirSync(BIN_DIR, { recursive: true });

for (const name of BIN_NAMES) {
  const link = resolve(BIN_DIR, name);
  rmSync(link, { force: true });
  symlinkSync("../../dist/bin.js", link);
}
