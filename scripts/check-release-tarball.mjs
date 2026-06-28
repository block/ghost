#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
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

  const expectedName = `anarchitecture-ghost-${PACKAGE_JSON.version}.tgz`;
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
    "node_modules/cac",
    "node_modules/fdir",
    "node_modules/jiti",
    "node_modules/picomatch",
    "node_modules/tinyglobby",
    "node_modules/yaml",
    "node_modules/zod",
  ];
  for (const relativePath of requiredPaths) {
    const fullPath = join(packageDir, relativePath);
    if (!existsSync(fullPath)) {
      fail(`release tarball is missing ${relativePath}`);
    }
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
