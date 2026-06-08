#!/usr/bin/env node
import { mkdirSync, rmSync, symlinkSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PACKAGE_ROOT = resolve(ROOT, "packages/ghost");
const BIN_DIR = resolve(PACKAGE_ROOT, "node_modules/.bin");
const BIN_LINK = resolve(BIN_DIR, "ghost");

mkdirSync(BIN_DIR, { recursive: true });

rmSync(BIN_LINK, { force: true });
symlinkSync("../../dist/bin.js", BIN_LINK);
