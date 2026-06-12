#!/usr/bin/env node
import { mkdirSync, rmSync, symlinkSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PACKAGE_ROOT = resolve(ROOT, "packages/ghost");
const BIN_LINKS = [
  {
    dir: resolve(ROOT, "node_modules/.bin"),
    target: "../../packages/ghost/dist/bin.js",
  },
  {
    dir: resolve(PACKAGE_ROOT, "node_modules/.bin"),
    target: "../../dist/bin.js",
  },
];

for (const { dir, target } of BIN_LINKS) {
  const link = resolve(dir, "ghost");
  mkdirSync(dir, { recursive: true });
  rmSync(link, { force: true });
  symlinkSync(target, link);
}
