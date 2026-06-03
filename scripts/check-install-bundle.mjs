#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const MANIFEST_PATH = resolve(ROOT, "install/manifest.json");
const INSTALL_SCRIPT = resolve(ROOT, "install/install.sh");
const EXPECTED_PACKAGE = "packages/ghost/src/skill-bundle";
const BUNDLE_ROOT = resolve(ROOT, EXPECTED_PACKAGE);

function fail(message) {
  console.error(`check-install-bundle failed: ${message}`);
  process.exit(1);
}

function listFiles(dir, root = dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...listFiles(full, root));
    } else if (stat.isFile()) {
      out.push(relative(root, full).replaceAll("\\", "/"));
    }
  }
  return out;
}

function skillBundleOrder(files) {
  return files.sort((a, b) => {
    if (a === "SKILL.md") return -1;
    if (b === "SKILL.md") return 1;
    return a.localeCompare(b);
  });
}

function assertSameList(label, actual, expected) {
  const actualJson = JSON.stringify(actual, null, 2);
  const expectedJson = JSON.stringify(expected, null, 2);
  if (actualJson === expectedJson) return;
  fail(
    `${label} mismatch.\nExpected:\n${expectedJson}\nActual:\n${actualJson}`,
  );
}

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));

if (manifest?.source?.package !== EXPECTED_PACKAGE) {
  fail(
    `manifest source.package must be '${EXPECTED_PACKAGE}', got '${manifest?.source?.package}'`,
  );
}

if (!Array.isArray(manifest.files) || manifest.files.length === 0) {
  fail("manifest files must be a non-empty array");
}

const expectedFiles = skillBundleOrder(listFiles(BUNDLE_ROOT));
assertSameList("manifest files", manifest.files, expectedFiles);

const tmpRoot = mkdtempSync(join(tmpdir(), "ghost-install-bundle-"));
const dest = join(tmpRoot, "ghost");

try {
  execFileSync(
    "sh",
    [
      INSTALL_SCRIPT,
      "--source",
      pathToFileURL(ROOT).href,
      "--dest",
      dest,
      "--force",
      "--agent",
      "codex",
    ],
    {
      cwd: ROOT,
      stdio: "pipe",
    },
  );

  const installedFiles = skillBundleOrder(listFiles(dest));
  assertSameList("installed files", installedFiles, manifest.files);
} finally {
  rmSync(tmpRoot, { recursive: true, force: true });
}

console.log(`check-install-bundle: ${manifest.files.length} files OK`);
