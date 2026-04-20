#!/usr/bin/env node
// Walk the cac command registry from the built @ghost/cli package and
// emit a JSON manifest of commands, flags, and descriptions. The docs
// site renders this manifest via <CliHelp command="…" />, so the CLI
// is the single source of truth — adding a flag to bin.ts (via cli.ts)
// propagates to the docs on the next build.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const CLI_DIST = resolve(ROOT, "packages/ghost-cli/dist/cli.js");
if (!existsSync(CLI_DIST)) {
  console.error(
    `ghost-cli dist not built. Run \`pnpm --filter ghost-cli build\` first.`,
  );
  process.exit(1);
}
const { buildCli } = await import(pathToFileURL(CLI_DIST).href);
const OUT = resolve(ROOT, "apps/docs/src/generated/cli-manifest.json");

const cli = buildCli();

const commands = cli.commands.map((cmd) => ({
  name: cmd.name,
  rawName: cmd.rawName,
  description: cmd.description,
  options: cmd.options.map((o) => ({
    rawName: o.rawName,
    name: o.name,
    description: o.description,
    default: o.config?.default ?? null,
    takesValue: /<[^>]+>/.test(o.rawName),
    negated: Boolean(o.negated),
  })),
}));

const globalOptions = cli.globalCommand.options.map((o) => ({
  rawName: o.rawName,
  name: o.name,
  description: o.description,
  default: o.config?.default ?? null,
}));

const manifest = {
  generatedAt: new Date().toISOString(),
  version: cli.globalCommand.versionNumber ?? null,
  commands,
  globalOptions,
};

mkdirSync(dirname(OUT), { recursive: true });

const serialized = `${JSON.stringify(manifest, null, 2)}\n`;

// Drift check: bail if the committed manifest differs from what the CLI
// currently emits. This keeps the docs and the CLI in lockstep under CI.
if (process.argv.includes("--check")) {
  if (!existsSync(OUT)) {
    console.error(
      `cli-manifest.json missing at ${OUT}. Run \`pnpm dump:cli-help\` and commit.`,
    );
    process.exit(1);
  }
  const existing = readFileSync(OUT, "utf8");
  // Ignore generatedAt drift — the timestamp changes on every run.
  const normalize = (s) =>
    s.replace(/"generatedAt": "[^"]+"/, '"generatedAt": "<timestamp>"');
  if (normalize(existing) !== normalize(serialized)) {
    console.error(
      `cli-manifest.json is stale. Run \`pnpm dump:cli-help\` and commit the result.`,
    );
    process.exit(1);
  }
  console.log("dump-cli-help: manifest in sync");
  process.exit(0);
}

writeFileSync(OUT, serialized);
console.log(
  `dump-cli-help: wrote ${commands.length} commands -> ${OUT.replace(`${ROOT}/`, "")}`,
);
