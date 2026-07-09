#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const ROOT = process.cwd();
const PACKAGE_JSON = JSON.parse(
  readFileSync(join(ROOT, "packages", "ghost", "package.json"), "utf8"),
);

function fail(message) {
  console.error(`check-release-tarball failed: ${message}`);
  process.exit(1);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? ROOT,
    encoding: "utf8",
    env: { ...process.env, ...(options.env ?? {}) },
  });
  if (result.error) {
    fail(
      `${command} ${args.join(" ")} failed to start: ${result.error.message}`,
    );
  }
  if (result.status !== 0) {
    fail(
      `${command} ${args.join(" ")} exited with ${result.status}\n${
        result.stderr || result.stdout
      }`,
    );
  }
  return result.stdout.trim();
}

const tmpRoot = mkdtempSync(join(tmpdir(), "ghost-release-tarball-check-"));
const packDir = join(tmpRoot, "pack");
const extractDir = join(tmpRoot, "extract");

try {
  mkdirSync(packDir, { recursive: true });
  mkdirSync(extractDir, { recursive: true });

  run("node", ["scripts/pack-release-tarball.mjs", packDir]);

  const expectedName = `design-intelligence-ghost-${PACKAGE_JSON.version}.tgz`;
  const tarballPath = resolve(packDir, expectedName);
  if (!existsSync(tarballPath)) {
    fail(`expected release tarball at ${tarballPath}`);
  }

  run("tar", ["-xzf", tarballPath, "-C", extractDir]);

  const packageDir = join(extractDir, "package");
  const requiredPaths = [
    "package.json",
    "dist/bin.js",
    "dist/cli.js",
    "dist/init-payloads/skeleton/anti-goal.median.md",
    "dist/init-payloads/vessel-light/manifest.yml",
    "dist/init-payloads/vessel-light/materials/fonts/HKGrotesk-Regular.woff2",
    "node_modules/cac",
    "node_modules/yaml",
    "node_modules/zod",
  ];
  for (const relativePath of requiredPaths) {
    const fullPath = join(packageDir, relativePath);
    if (!existsSync(fullPath)) {
      fail(`release tarball is missing ${relativePath}`);
    }
  }

  // Binary payloads must survive packing byte-for-byte.
  const fontRelative = "materials/fonts/HKGrotesk-Regular.woff2";
  const packedFont = statSync(
    join(packageDir, "dist", "init-payloads", "vessel-light", fontRelative),
  );
  const sourceFont = statSync(
    join(ROOT, "packages", "vessel-light", ".ghost", fontRelative),
  );
  if (packedFont.size !== sourceFont.size) {
    fail(
      `packed font size ${packedFont.size} does not match source ${sourceFont.size}`,
    );
  }

  const packedPkg = JSON.parse(
    readFileSync(join(packageDir, "package.json"), "utf8"),
  );
  if (
    packedPkg.bin?.ghost !== "./dist/bin.js" ||
    packedPkg.bin?.["ghost-fingerprint"] !== "./dist/bin.js"
  ) {
    fail(
      "release tarball package.json must expose both ghost and ghost-fingerprint bins pointing at ./dist/bin.js",
    );
  }

  const help = run("node", [join(packageDir, "dist", "bin.js"), "--help"], {
    cwd: tmpRoot,
  });
  if (!help.includes("Core workflow")) {
    fail("release tarball ghost --help output did not include Core workflow");
  }

  const init = run(
    "node",
    [join(packageDir, "dist", "bin.js"), "init", "--format", "json"],
    { cwd: tmpRoot },
  );
  const initOutput = JSON.parse(init);
  if (
    !initOutput.dir?.endsWith(".ghost") ||
    !Array.isArray(initOutput.written) ||
    !initOutput.written.includes("manifest.yml")
  ) {
    fail(
      "release tarball ghost init did not scaffold the expected node package",
    );
  }

  // The vessel-light body installs from the standalone tarball too.
  const bodyDir = join(tmpRoot, "body-consumer");
  mkdirSync(bodyDir, { recursive: true });
  const bodyInit = run(
    "node",
    [
      join(packageDir, "dist", "bin.js"),
      "init",
      "--body",
      "vessel-light",
      "--format",
      "json",
    ],
    { cwd: bodyDir },
  );
  const bodyOutput = JSON.parse(bodyInit);
  for (const required of [
    "anti-goal.median.md",
    "materials/fonts/HKGrotesk-Regular.woff2",
    "checks/values.md",
  ]) {
    if (!bodyOutput.written?.includes(required)) {
      fail(
        `release tarball ghost init --body vessel-light did not write ${required}`,
      );
    }
  }

  const topLevelEntries = readdirSync(extractDir);
  if (topLevelEntries.length !== 1 || topLevelEntries[0] !== "package") {
    fail("release tarball must extract to a single package/ directory");
  }

  console.log(
    `check-release-tarball: ${expectedName} runs without installing dependencies`,
  );
} finally {
  rmSync(tmpRoot, { recursive: true, force: true });
}
