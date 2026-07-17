#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const ROOT = process.cwd();
const PACKAGE_NAME = "@design-intelligence/ghost";
const PUBLIC_IMPORTS = [
  "@design-intelligence/ghost",
  "@design-intelligence/ghost/cli",
  "@design-intelligence/ghost/package",
  "@design-intelligence/ghost/fingerprint",
  "@design-intelligence/ghost/scan",
  "@design-intelligence/ghost/core",
];

function fail(message) {
  console.error(`check-packed-package failed: ${message}`);
  process.exit(1);
}

function run(command, args, options = {}) {
  // Strip npm_config_* vars injected by the parent `pnpm run` so the
  // temp consumer install resolves its registry from its own environment
  // (e.g. the user's ~/.npmrc) instead of this repo's .npmrc.
  const parentEnv = Object.fromEntries(
    Object.entries(process.env).filter(
      ([key]) => !key.toLowerCase().startsWith("npm_config_"),
    ),
  );
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? ROOT,
    encoding: "utf8",
    env: { ...parentEnv, ...(options.env ?? {}) },
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

function runNode(source, cwd) {
  run("node", ["--input-type=module", "--eval", source], { cwd });
}

const tmpRoot = mkdtempSync(join(tmpdir(), "ghost-packed-package-"));
const packDir = join(tmpRoot, "pack");
const consumerDir = join(tmpRoot, "consumer");
const REQUIRED_DIST_FILES = [
  "bin.js",
  "cli.js",
  "index.js",
  join("ghost-core", "index.js"),
].map((path) => join(ROOT, "packages", "ghost", "dist", path));

try {
  const missingDistFile = REQUIRED_DIST_FILES.find((path) => !existsSync(path));
  if (missingDistFile) {
    fail(
      `missing built package output at ${missingDistFile}; run pnpm --filter ${PACKAGE_NAME} build first`,
    );
  }
  mkdirSync(packDir, { recursive: true });
  mkdirSync(consumerDir, { recursive: true });
  run("pnpm", [
    "--filter",
    PACKAGE_NAME,
    "pack",
    "--pack-destination",
    packDir,
  ]);

  const tarballs = readdirSync(packDir).filter((name) => name.endsWith(".tgz"));
  if (tarballs.length !== 1) {
    fail(`expected exactly one packed tarball, found ${tarballs.length}`);
  }
  const tarballPath = resolve(packDir, tarballs[0]);
  const packedEntries = run("tar", ["-tzf", tarballPath]).split("\n");
  if (
    packedEntries.some((entry) => entry.startsWith("package/node_modules/"))
  ) {
    fail("npm package tarball must not include node_modules");
  }

  writeFileSync(
    join(consumerDir, "package.json"),
    JSON.stringify(
      {
        type: "module",
        private: true,
        packageManager: "pnpm@10.33.0",
      },
      null,
      2,
    ),
  );
  run(
    "pnpm",
    ["install", "--prefer-offline", "--ignore-scripts", tarballPath],
    {
      cwd: consumerDir,
    },
  );

  const help = run("pnpm", ["exec", "ghost", "--help"], {
    cwd: consumerDir,
  });
  if (!help.includes("Core workflow")) {
    fail("packed ghost --help output did not include Core workflow");
  }

  // The alias bin is the same CLI under a collision-safe name.
  const aliasHelp = run("pnpm", ["exec", "ghost-fingerprint", "--help"], {
    cwd: consumerDir,
  });
  if (!aliasHelp.includes("Core workflow")) {
    fail(
      "packed ghost-fingerprint --help output did not include Core workflow",
    );
  }

  const init = run("pnpm", ["exec", "ghost", "init", "--format", "json"], {
    cwd: consumerDir,
  });
  const initOutput = JSON.parse(init);
  if (
    !initOutput.dir?.endsWith(".ghost") ||
    !Array.isArray(initOutput.written) ||
    !initOutput.written.includes("manifest.yml")
  ) {
    fail("packed ghost init did not scaffold the expected node package");
  }
  run("pnpm", ["exec", "ghost", "lint", ".ghost"], { cwd: consumerDir });

  // The vessel-light body must survive packing: corpus, binary fonts, checks.
  // Run from the consumer root (where the tarball is installed) and target a
  // separate package dir — `pnpm exec` from a bare subdirectory would escape
  // to any globally installed ghost.
  const bodyPackageDir = join("body-consumer", ".ghost");
  const bodyInit = run(
    "pnpm",
    [
      "exec",
      "ghost",
      "init",
      "--body",
      "vessel-light",
      "--package",
      bodyPackageDir,
      "--format",
      "json",
    ],
    { cwd: consumerDir },
  );
  const bodyOutput = JSON.parse(bodyInit);
  for (const required of [
    "manifest.yml",
    "anti-goal.median.md",
    "materials/fonts/HKGrotesk-Regular.woff2",
    "checks/values.md",
  ]) {
    if (!bodyOutput.written?.includes(required)) {
      fail(`packed ghost init --body vessel-light did not write ${required}`);
    }
  }
  run("pnpm", ["exec", "ghost", "lint", bodyPackageDir], { cwd: consumerDir });

  for (const specifier of PUBLIC_IMPORTS) {
    runNode(`await import(${JSON.stringify(specifier)});`, consumerDir);
  }

  // Smoke the exported CLI builder as an embeddable package entrypoint.
  runNode(
    `const { buildCli } = await import("@design-intelligence/ghost/cli");\n` +
      `if (typeof buildCli !== "function") throw new Error("missing buildCli export");`,
    consumerDir,
  );

  console.log(`check-packed-package: ${tarballs[0]} installs and imports OK`);
} finally {
  rmSync(tmpRoot, { recursive: true, force: true });
}
