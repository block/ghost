#!/usr/bin/env node

import { existsSync } from "node:fs";
import { resolve } from "node:path";

// Load .env from the working directory if present.
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

import { buildCli } from "./cli.js";

const cli = buildCli();
cli.parse();
