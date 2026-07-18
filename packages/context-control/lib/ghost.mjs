// Thin shell adapter over the real ghost CLI. context-control never
// re-implements ghost semantics; everything deterministic comes from
// `ghost gather --format json` and `ghost pull --format json`.
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** Resolve the ghost bin: repo dist build if present, else `ghost` on PATH. */
export function defaultGhostBin() {
  const repoBin = fileURLToPath(
    new URL("../../ghost/dist/bin.js", import.meta.url),
  );
  if (existsSync(repoBin)) return ["node", repoBin];
  return ["ghost"];
}

// The ghost CLI calls process.exit() right after writing stdout. When
// stdout is a pipe, output past the 64KB pipe buffer is dropped before it
// flushes, truncating large pull packets. Route stdout through a temp file
// (a file write flushes synchronously on exit) until the CLI flushes
// before exiting.
async function runGhost(ghostBin, args) {
  const [cmd, ...prefix] = ghostBin;
  const dir = await mkdtemp(join(tmpdir(), "context-control-"));
  const outFile = join(dir, "stdout.json");
  try {
    await execFileAsync(
      "/bin/sh",
      ["-c", `exec "$@" > "${outFile}"`, "sh", cmd, ...prefix, ...args],
      { maxBuffer: 32 * 1024 * 1024 },
    );
    return await readFile(outFile, "utf-8");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function gatherMenu({ ghostBin, packageDir }) {
  const stdout = await runGhost(ghostBin, [
    "gather",
    "--format",
    "json",
    "--package",
    packageDir,
  ]);
  return JSON.parse(stdout);
}

export async function pullNode({ ghostBin, packageDir, id }) {
  const stdout = await runGhost(ghostBin, [
    "pull",
    id,
    "--format",
    "json",
    "--no-events",
    "--package",
    packageDir,
  ]);
  return JSON.parse(stdout);
}
