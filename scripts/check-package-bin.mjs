#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { constants, existsSync, readFileSync, statSync } from "node:fs";
import { access } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PACKAGE_JSON_PATH = resolve(ROOT, "packages/ghost/package.json");
const EXPECTED_SHEBANG = "#!/usr/bin/env node";

function fail(message) {
  console.error(`check-package-bin failed: ${message}`);
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(PACKAGE_JSON_PATH, "utf8"));
const binPath = pkg?.bin?.ghost;
const packageVersion = pkg?.version;

if (typeof binPath !== "string" || binPath.length === 0) {
  fail("packages/ghost/package.json must define bin.ghost");
}

if (typeof packageVersion !== "string" || packageVersion.length === 0) {
  fail("packages/ghost/package.json must define version");
}

const binAbsolutePath = resolve(dirname(PACKAGE_JSON_PATH), binPath);

if (!existsSync(binAbsolutePath)) {
  fail(`bin.ghost target does not exist: ${binPath}`);
}

const stat = statSync(binAbsolutePath);
if (!stat.isFile()) {
  fail(`bin.ghost target is not a file: ${binPath}`);
}

const firstLine = readFileSync(binAbsolutePath, "utf8").split(/\r?\n/, 1)[0];
if (firstLine !== EXPECTED_SHEBANG) {
  fail(`bin.ghost must start with '${EXPECTED_SHEBANG}', got '${firstLine}'`);
}

if (process.platform !== "win32") {
  try {
    await access(binAbsolutePath, constants.X_OK);
  } catch {
    fail(`bin.ghost target must be executable: ${binPath}`);
  }
}

const result = spawnSync(binAbsolutePath, ["--help"], {
  cwd: ROOT,
  encoding: "utf8",
});

if (result.error) {
  fail(`spawning bin.ghost failed: ${result.error.message}`);
}

if (result.status !== 0) {
  fail(
    `bin.ghost --help exited with ${result.status}\n${result.stderr || result.stdout}`,
  );
}

const pnpmResult = spawnSync(
  "pnpm",
  ["--filter", "@anarchitecture/ghost", "exec", "ghost", "--help"],
  {
    cwd: ROOT,
    encoding: "utf8",
  },
);

if (pnpmResult.error) {
  fail(`pnpm exec ghost failed: ${pnpmResult.error.message}`);
}

if (pnpmResult.status !== 0) {
  fail(
    `pnpm exec ghost --help exited with ${pnpmResult.status}\n${
      pnpmResult.stderr || pnpmResult.stdout
    }`,
  );
}

const rootPnpmVersionResult = spawnSync(
  "pnpm",
  ["exec", "ghost", "--version"],
  {
    cwd: ROOT,
    encoding: "utf8",
  },
);

if (rootPnpmVersionResult.error) {
  fail(`root pnpm exec ghost failed: ${rootPnpmVersionResult.error.message}`);
}

if (rootPnpmVersionResult.status !== 0) {
  fail(
    `root pnpm exec ghost --version exited with ${rootPnpmVersionResult.status}\n${
      rootPnpmVersionResult.stderr || rootPnpmVersionResult.stdout
    }`,
  );
}

const rootVersion = rootPnpmVersionResult.stdout.trim();
const expectedRootVersion = `ghost/${packageVersion}`;
if (!rootVersion.startsWith(expectedRootVersion)) {
  fail(
    `root pnpm exec ghost resolved '${rootVersion}', expected '${expectedRootVersion}'`,
  );
}

console.log(`check-package-bin: ${binPath} OK`);
