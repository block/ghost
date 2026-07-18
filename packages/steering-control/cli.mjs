#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { assemblePrompt, writePrompt } from "./lib/arms.mjs";
import { loadConfig } from "./lib/config.mjs";
import { scoreAll } from "./lib/score.mjs";
import { shootAll } from "./lib/shoot.mjs";
import { closeRun, openRun } from "./lib/tape.mjs";

const args = process.argv.slice(2);
const command = args[0];

try {
  if (!command || command === "--help" || command === "-h") usage();
  else if (command === "init") init();
  else if (command === "prompt") prompt(args.slice(1));
  else if (command === "finish") finish(args.slice(1));
  else if (command === "shoot") shootAll(loadConfig(process.cwd()));
  else if (command === "score") scoreAll(loadConfig(process.cwd()));
  else if (command === "report") await report();
  else {
    console.error(`unknown command: ${command}`);
    usage(1);
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

function usage(exitCode = 0) {
  console.log(`usage: steering-control <command> [args]

Commands:
  init
  prompt <arm> <ask-n> --run <k>
  finish <arm> <ask-n> <k>
  shoot
  score
  report
  --help`);
  process.exit(exitCode);
}

function init() {
  const files = {
    "eval.config.json": `${JSON.stringify(starterConfig(), null, 2)}\n`,
    "asks.md": `## Ask 1 — billing settings page\n\nBuild a billing settings page for a SaaS product.\n\nexpect: foundation.tokens, primitive.control\npoison: pattern.email\ndiscount:\n`,
    "ballast.md": `This is fixed ballast context. Replace it with realistic irrelevant project context before running an evaluation.\n`,
  };
  for (const file of Object.keys(files)) {
    if (existsSync(file)) throw new Error(`refusing to overwrite ${file}`);
  }
  for (const [file, content] of Object.entries(files))
    writeFileSync(file, content, "utf8");
  console.log("wrote eval.config.json, asks.md, ballast.md");
}

function prompt(argv) {
  const [arm, askN] = argv;
  const runK = readRun(argv);
  if (!arm || !askN || !runK) usage(1);
  const config = loadConfig(process.cwd());
  openRun(config, arm, Number(askN), Number(runK));
  const assembled = assemblePrompt(config, arm, Number(askN), Number(runK));
  const paths = writePrompt(config, arm, Number(askN), Number(runK), assembled);
  console.log(`prompt: ${paths.promptPath}`);
  console.log(`output: ${paths.outputPath}`);
}

function finish(argv) {
  const [arm, askN, runK] = argv;
  if (!arm || !askN || !runK) usage(1);
  const config = loadConfig(process.cwd());
  const tape = closeRun(config);
  const dir = join(config.out, arm, `ask-${askN}`);
  const htmlPath = join(dir, `run-${runK}.html`);
  if (!existsSync(htmlPath))
    console.warn(`warning: expected output HTML not found: ${htmlPath}`);
  const promptPath = join(dir, `run-${runK}.prompt.md`);
  const inventoryPath = promptPath.replace(/\.prompt\.md$/u, ".inventory.json");
  const inventory = existsSync(inventoryPath)
    ? JSON.parse(readFileSync(inventoryPath, "utf8"))
    : existsSync(promptPath)
      ? inventoryFromPrompt(readFileSync(promptPath, "utf8"))
      : {};
  const meta = { arm, askN: Number(askN), runK: Number(runK), inventory, tape };
  if (arm === "gather") {
    const loop = readLoopReceipt(dir, runK);
    if (loop) meta.loop = loop;
  }
  writeFileSync(
    join(dir, `run-${runK}.meta.json`),
    JSON.stringify(meta, null, 2),
    "utf8",
  );
  console.log(`meta: ${join(dir, `run-${runK}.meta.json`)}`);
}

async function report() {
  const config = loadConfig(process.cwd());
  const metricsJsonPath = join(config.out, "metrics.json");
  try {
    const mod = await import("./lib/report.mjs");
    await mod.renderReport(metricsJsonPath, config.out);
    console.log(`report: ${join(config.out, "report.html")}`);
  } catch (error) {
    if (error.code === "ERR_MODULE_NOT_FOUND") {
      console.error("report module not yet available");
      process.exit(1);
    }
    throw error;
  }
}

function readLoopReceipt(dir, runK) {
  const receiptPath = join(dir, `run-${runK}.loop.json`);
  if (!existsSync(receiptPath)) {
    console.warn(`warning: expected loop receipt not found: ${receiptPath}`);
    return null;
  }
  let receipt;
  try {
    receipt = JSON.parse(readFileSync(receiptPath, "utf8"));
  } catch (error) {
    console.warn(
      `warning: invalid loop receipt JSON at ${receiptPath}: ${error.message}`,
    );
    return null;
  }
  if (!validLoopReceipt(receipt)) {
    console.warn(`warning: invalid loop receipt shape at ${receiptPath}`);
    return null;
  }
  return receipt;
}
function validLoopReceipt(receipt) {
  return (
    receipt &&
    typeof receipt === "object" &&
    !Array.isArray(receipt) &&
    Array.isArray(receipt.pulledIds) &&
    receipt.pulledIds.every((item) => typeof item === "string") &&
    Array.isArray(receipt.inspectedMaterials) &&
    receipt.inspectedMaterials.every((item) => typeof item === "string") &&
    typeof receipt.rendered === "boolean" &&
    Number.isFinite(receipt.repairPasses) &&
    receipt.repairPasses >= 0 &&
    typeof receipt.reviewRan === "boolean"
  );
}
function readRun(argv) {
  const index = argv.indexOf("--run");
  return index >= 0 ? argv[index + 1] : null;
}
function starterConfig() {
  return {
    package: "./.ghost",
    asks: "./asks.md",
    ballast: "./ballast.md",
    runsPerCell: 5,
    arms: {
      naked: true,
      dump: true,
      gather: true,
      "dump-growth": { extraPackages: ["../other/.ghost"], asks: [1] },
    },
    tells: null,
    out: "./out",
    ghostBin: "ghost",
  };
}
function inventoryFromPrompt(prompt) {
  const total = (prompt.match(/\S+/gu) ?? []).length;
  return { total, tokensEstimate: Math.round(total * 1.33) };
}
