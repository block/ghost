#!/usr/bin/env node
// Walk the cac command registry from each built Ghost tool and emit a
// JSON manifest of commands, flags, and descriptions per tool. The docs
// site renders this manifest via <CliHelp tool="…" command="…" />, so
// the CLIs are the single source of truth — adding a flag to a bin.ts
// (via cli.ts) propagates to the docs on the next build.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();

const TOOLS = [
  { name: "ghost-drift", dist: "packages/ghost-drift/dist/cli.js" },
  { name: "ghost-expression", dist: "packages/ghost-expression/dist/cli.js" },
  { name: "ghost-fleet", dist: "packages/ghost-fleet/dist/cli.js" },
];

const OUT = resolve(ROOT, "apps/docs/src/generated/cli-manifest.json");

const tools = [];
for (const tool of TOOLS) {
  const cliDist = resolve(ROOT, tool.dist);
  if (!existsSync(cliDist)) {
    console.error(
      `${tool.name} dist not built. Run \`pnpm --filter ${tool.name} build\` first (or \`pnpm build\`).`,
    );
    process.exit(1);
  }
  const { buildCli } = await import(pathToFileURL(cliDist).href);
  const cli = buildCli();

  const commands = cli.commands.map((cmd) => ({
    tool: tool.name,
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

  tools.push({ tool: tool.name, commands, globalOptions });
}

// Intentionally omits `version`: each CLI reads its version from
// package.json at runtime, so baking it in here would make every
// Changesets-driven version bump drift the committed manifest and
// fail CI. Command/flag shape is what the docs render — that's the
// only signal the drift check needs to guard.
const manifest = {
  generatedAt: new Date().toISOString(),
  tools,
};

mkdirSync(dirname(OUT), { recursive: true });

const serialized = `${JSON.stringify(manifest, null, 2)}\n`;

// Drift check: bail if the committed manifest differs from what the CLIs
// currently emit. This keeps the docs and the CLIs in lockstep under CI.
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
const totalCommands = tools.reduce((sum, t) => sum + t.commands.length, 0);
console.log(
  `dump-cli-help: wrote ${totalCommands} command${totalCommands === 1 ? "" : "s"} across ${tools.length} tool${tools.length === 1 ? "" : "s"} -> ${OUT.replace(`${ROOT}/`, "")}`,
);
