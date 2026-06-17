#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PACKAGE_JSON_PATH = resolve(ROOT, "packages/ghost/package.json");
const PACKAGE_NAME = "@anarchitecture/ghost";
const MARKER_PATH = resolve(
  ROOT,
  process.env.GHOST_RELEASE_MARKER_PATH ?? ".release-published.json",
);

function fail(message) {
  console.error(`publish-ghost-package failed: ${message}`);
  process.exit(1);
}

function readPackageJson() {
  try {
    return JSON.parse(readFileSync(PACKAGE_JSON_PATH, "utf8"));
  } catch (error) {
    fail(`could not read ${PACKAGE_JSON_PATH}: ${error.message}`);
  }
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    env: process.env,
    stdio: "inherit",
  });
  if (result.error) {
    fail(
      `${command} ${args.join(" ")} failed to start: ${result.error.message}`,
    );
  }
  if (result.status !== 0) {
    fail(`${command} ${args.join(" ")} exited with ${result.status}`);
  }
}

const pkg = readPackageJson();
if (pkg.name !== PACKAGE_NAME) {
  fail(`expected package name ${PACKAGE_NAME}, got ${pkg.name}`);
}
if (typeof pkg.version !== "string" || pkg.version.length === 0) {
  fail("packages/ghost/package.json must define a non-empty version");
}

rmSync(MARKER_PATH, { force: true });

const publishArgs = [
  "publish",
  "./packages/ghost",
  "--access",
  "public",
  "--provenance",
];

if (process.env.GHOST_PUBLISH_DRY_RUN === "1") {
  publishArgs.push("--dry-run");
}

run("npm", publishArgs);

writeFileSync(
  MARKER_PATH,
  `${JSON.stringify({ name: PACKAGE_NAME, version: pkg.version }, null, 2)}\n`,
);

console.log(
  `publish-ghost-package: wrote release marker for ${PACKAGE_NAME}@${pkg.version}`,
);
