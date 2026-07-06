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
const EXPECTED_BINS = ["ghost", "ghost-fingerprint"];

for (const binName of EXPECTED_BINS) {
  const target = pkg?.bin?.[binName];
  if (typeof target !== "string" || target.length === 0) {
    fail(`packages/ghost/package.json must define bin.${binName}`);
  }
}

const binPath = pkg.bin.ghost;
if (pkg.bin["ghost-fingerprint"] !== binPath) {
  fail("bin.ghost-fingerprint must point at the same target as bin.ghost");
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
  ["--filter", "@design-intelligence/ghost", "exec", "ghost", "--help"],
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

console.log(`check-package-bin: ${binPath} OK`);
