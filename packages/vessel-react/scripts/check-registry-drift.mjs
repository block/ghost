#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(packageDirectory, "../..");
const trackedOutputs = [
  "packages/vessel-react/registry.json",
  "packages/vessel-react/.shadcn/skills.md",
  "packages/vessel-react/public/r",
];

function git(args, options = {}) {
  return spawnSync("git", args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    ...options,
  });
}

const existingDiff = git(["diff", "--quiet", "--", ...trackedOutputs]);
if (existingDiff.error || existingDiff.status !== 0) {
  console.error(
    "Vessel registry outputs already have local changes. Commit or restore them before checking drift.",
  );
  process.exit(1);
}

const build = spawnSync("pnpm", ["run", "build:registry"], {
  cwd: packageDirectory,
  stdio: "inherit",
});
if (build.error) {
  console.error(`Unable to build the Vessel registry: ${build.error.message}`);
  process.exit(1);
}
if (build.status !== 0) process.exit(build.status ?? 1);

const changed = git(["diff", "--name-only", "--", ...trackedOutputs]);
const untracked = git([
  "ls-files",
  "--others",
  "--exclude-standard",
  "--",
  ...trackedOutputs,
]);
if (
  changed.error ||
  changed.status !== 0 ||
  untracked.error ||
  untracked.status !== 0
) {
  console.error(
    changed.stderr ||
      untracked.stderr ||
      changed.error?.message ||
      untracked.error?.message,
  );
  process.exit(1);
}

const outputFiles = new Set(
  `${changed.stdout}\n${untracked.stdout}`.trim().split("\n").filter(Boolean),
);
const staleFiles = [];
const formattingOnlyFiles = [];
for (const file of outputFiles) {
  if (file.endsWith(".json")) {
    const committed = git(["show", `HEAD:${file}`]);
    if (committed.status === 0) {
      try {
        const before = JSON.parse(committed.stdout);
        const after = JSON.parse(
          readFileSync(resolve(repositoryRoot, file), "utf8"),
        );
        if (JSON.stringify(before) === JSON.stringify(after)) {
          formattingOnlyFiles.push(file);
          continue;
        }
      } catch {
        // Let git diff report malformed or otherwise non-equivalent JSON.
      }
    }
  }
  staleFiles.push(file);
}

if (formattingOnlyFiles.length > 0) {
  const restore = git(["restore", "--", ...formattingOnlyFiles]);
  if (restore.error || restore.status !== 0) {
    console.error(restore.stderr || restore.error?.message);
    process.exit(1);
  }
}

if (staleFiles.length > 0) {
  const diff = git(["diff", "--", ...staleFiles]);
  process.stdout.write(diff.stdout);
  console.error(
    "Vessel registry output is stale. Run `pnpm --filter @design-intelligence/vessel-react build:registry` and commit the generated files.",
  );
  process.exit(1);
}

console.log("Vessel registry output is current.");
