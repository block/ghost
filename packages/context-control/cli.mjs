#!/usr/bin/env node
// context-control: view a fingerprint as the selection surface it is, and
// bench single-shot selection against it. No generation, ever.
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { defaultGhostBin } from "./lib/ghost.mjs";
import { startServer } from "./lib/server.mjs";

// Load .env from the working directory if present (DATABRICKS_HOST lives
// in an untracked .env / .env.local, same convention as the ghost CLI).
for (const envFile of [".env", ".env.local"]) {
  const envPath = resolve(process.cwd(), envFile);
  if (existsSync(envPath)) {
    process.loadEnvFile(envPath);
  }
}

const args = process.argv.slice(2);

if (args[0] === "--help" || args[0] === "-h") {
  console.log(`usage: context-control [options]

Serves the context-control UI for a .ghost fingerprint package.

Options:
  --package <dir>   fingerprint package directory (default: ./.ghost)
  --asks <file>     asks.md with numbered asks + optional expect: lines
  --port <n>        port (default: 4114)
  --ghost <bin>     ghost binary (default: repo dist build, else PATH)`);
  process.exit(0);
}

const opts = { package: "./.ghost", asks: null, port: 4114, ghost: null };
for (let i = 0; i < args.length; i += 2) {
  const key = args[i]?.replace(/^--/, "");
  if (!(key in opts) || args[i + 1] === undefined) {
    console.error(`unknown or valueless option: ${args[i]}`);
    process.exit(2);
  }
  opts[key] = args[i + 1];
}

const packageDir = resolve(process.cwd(), opts.package);
if (!existsSync(packageDir)) {
  console.error(`no fingerprint package at ${packageDir}`);
  process.exit(2);
}

const ghostBin = opts.ghost ? [opts.ghost] : defaultGhostBin();
const port = Number(opts.port);
await startServer({
  ghostBin,
  packageDir,
  asksPath: opts.asks ? resolve(process.cwd(), opts.asks) : null,
  port,
});
console.log(
  `context-control: http://127.0.0.1:${port}  (package: ${packageDir})`,
);
