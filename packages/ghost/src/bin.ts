#!/usr/bin/env node

import { existsSync } from "node:fs";
import { resolve } from "node:path";

// Load .env from project root if present.
for (const envFile of [".env", ".env.local"]) {
  const envPath = resolve(process.cwd(), envFile);
  if (existsSync(envPath)) {
    try {
      process.loadEnvFile(envPath);
    } catch {
      // Node < 20.12 or malformed file — silently skip
    }
  }
}

// Git-style external subcommand: `ghost haunt <cmd>` dispatches to the
// external `ghost-haunt` binary (the private adherence layer) when installed.
if (process.argv[2] === "haunt") {
  const { spawnSync } = await import("node:child_process");
  const args = process.argv.slice(3);
  const candidates = ["ghost-haunt"];
  // Fallback: node_modules/.bin relative to the cwd, for contexts where
  // .bin is not on PATH.
  const localBin = resolve(
    process.cwd(),
    "node_modules",
    ".bin",
    process.platform === "win32" ? "ghost-haunt.cmd" : "ghost-haunt",
  );
  if (existsSync(localBin)) candidates.push(localBin);

  let dispatched = false;
  for (const candidate of candidates) {
    const result = spawnSync(candidate, args, { stdio: "inherit" });
    const errorCode = (result.error as NodeJS.ErrnoException | undefined)?.code;
    if (errorCode === "ENOENT") continue;
    if (result.error) {
      process.stderr.write(
        `ghost: failed to run ghost-haunt: ${result.error.message}\n`,
      );
      process.exit(2);
    }
    dispatched = true;
    process.exit(result.status ?? 0);
  }
  if (!dispatched) {
    process.stderr.write(
      "ghost: haunt is not installed. Install the @anarchitecture/ghost-haunt package to get the `ghost-haunt` CLI.\n",
    );
    process.exit(2);
  }
}

import { buildCli } from "./cli.js";

const cli = buildCli();
cli.parse();
