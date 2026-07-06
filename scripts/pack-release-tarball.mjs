#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const ROOT = process.cwd();
const PACKAGE_DIR = join(ROOT, "packages", "ghost");
const PACKAGE_JSON_PATH = join(PACKAGE_DIR, "package.json");
const PACKAGE_JSON = JSON.parse(readFileSync(PACKAGE_JSON_PATH, "utf8"));
const DESTINATION = process.argv[2];
const require = createRequire(import.meta.url);
const copiedDependencies = new Set();

function fail(message) {
  console.error(`pack-release-tarball failed: ${message}`);
  process.exit(1);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? ROOT,
    encoding: "utf8",
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
}

function copyIfPresent(from, to) {
  if (existsSync(from)) {
    cpSync(from, to, { recursive: true, dereference: true });
  }
}

function resolveDependencyPath(name, fromDir) {
  const dependencyPath = join(fromDir, "node_modules", ...name.split("/"));
  if (existsSync(dependencyPath)) {
    return realpathSync(dependencyPath);
  }

  try {
    return dirname(
      require.resolve(`${name}/package.json`, { paths: [fromDir] }),
    );
  } catch {
    return undefined;
  }
}

function copyDependency(name, nodeModulesDir, fromDir = PACKAGE_DIR) {
  if (copiedDependencies.has(name)) return;

  const dependencyPath = resolveDependencyPath(name, fromDir);
  if (!dependencyPath) {
    fail(
      `missing installed dependency ${name}; run pnpm install --frozen-lockfile first`,
    );
  }

  const destinationPath = join(nodeModulesDir, ...name.split("/"));
  mkdirSync(dirname(destinationPath), { recursive: true });
  cpSync(dependencyPath, destinationPath, {
    recursive: true,
    dereference: true,
  });
  copiedDependencies.add(name);

  const dependencyPackageJson = JSON.parse(
    readFileSync(join(dependencyPath, "package.json"), "utf8"),
  );
  for (const transitiveName of Object.keys(
    dependencyPackageJson.dependencies ?? {},
  )) {
    copyDependency(transitiveName, nodeModulesDir, dependencyPath);
  }
}

if (!DESTINATION) {
  fail("usage: node scripts/pack-release-tarball.mjs <destination-dir>");
}

const requiredDistFiles = ["bin.js", "cli.js", "index.js"].map((file) =>
  join(PACKAGE_DIR, "dist", file),
);
for (const distFile of requiredDistFiles) {
  if (!existsSync(distFile)) {
    fail(
      `missing built output at ${distFile}; run pnpm --filter @design-intelligence/ghost build first`,
    );
  }
}

const destinationDir = resolve(DESTINATION);
mkdirSync(destinationDir, { recursive: true });

const tmpRoot = mkdtempSync(join(tmpdir(), "ghost-release-tarball-"));
const stagingPackage = join(tmpRoot, "package");

try {
  mkdirSync(stagingPackage, { recursive: true });

  cpSync(PACKAGE_JSON_PATH, join(stagingPackage, "package.json"));
  copyIfPresent(
    join(PACKAGE_DIR, "README.md"),
    join(stagingPackage, "README.md"),
  );
  copyIfPresent(join(ROOT, "LICENSE"), join(stagingPackage, "LICENSE"));
  cpSync(join(PACKAGE_DIR, "dist"), join(stagingPackage, "dist"), {
    recursive: true,
    dereference: true,
  });
  chmodSync(join(stagingPackage, "dist", "bin.js"), 0o755);

  const nodeModulesDir = join(stagingPackage, "node_modules");
  mkdirSync(nodeModulesDir, { recursive: true });
  for (const dependencyName of Object.keys(PACKAGE_JSON.dependencies ?? {})) {
    copyDependency(dependencyName, nodeModulesDir);
  }

  const archiveName = `design-intelligence-ghost-${PACKAGE_JSON.version}.tgz`;
  const archivePath = join(destinationDir, archiveName);
  rmSync(archivePath, { force: true });
  run("tar", ["-czf", archivePath, "-C", tmpRoot, "package"]);
  console.log(`Packed ${archivePath}`);
} finally {
  rmSync(tmpRoot, { recursive: true, force: true });
}
