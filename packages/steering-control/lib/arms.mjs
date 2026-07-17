import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { parseAsks } from "./asks.mjs";

export function assemblePrompt(config, arm, askN, runK) {
  const ask = findAsk(config, askN);
  const ballast = readFileSync(config.ballast, "utf8").trim();
  const outputPath = htmlPath(config, arm, askN, runK);
  const segments = [];
  let brand = "";
  let menu = "";

  if (arm === "dump" || arm === "dump-growth") {
    brand = dumpPackage(config.package);
    if (arm === "dump-growth") {
      for (const extra of config.arms["dump-growth"]?.extraPackages ?? []) {
        brand += `\n\n${dumpPackage(extra)}`;
      }
    }
    segments.push(section("Brand guidance", brand));
  } else if (arm === "gather") {
    const [ghostCmd, ...ghostPre] = config.ghostBin.split(/\s+/u);
    menu = execFileSync(
      ghostCmd,
      [
        ...ghostPre,
        ...(config.ghostArgs ?? []),
        "gather",
        firstLine(ask.body),
        "--package",
        config.package,
      ],
      { encoding: "utf8" },
    );
    segments.push(section("ghost gather menu", menu.trim()));
    segments.push(
      section("Selection instructions", gatherInstructions(config)),
    );
  }

  segments.push(section("Ballast", ballast));
  segments.push(section("Ask", ask.body));
  segments.push(`Write a single self-contained HTML file to: ${outputPath}`);
  segments.push(
    "Every prompt ends with: write a single self-contained HTML file to the output path given.",
  );

  const prompt = segments.filter(Boolean).join("\n\n");
  const inventory = inventoryFor({ ballast, brand, menu, ask: ask.body });
  return { prompt, inventory };
}

export function writePrompt(
  config,
  arm,
  askN,
  runK,
  assembled = assemblePrompt(config, arm, askN, runK),
) {
  const dir = join(config.out, arm, `ask-${askN}`);
  mkdirSync(dir, { recursive: true });
  const promptPath = join(dir, `run-${runK}.prompt.md`);
  const outputPath = join(dir, `run-${runK}.html`);
  writeFileSync(promptPath, assembled.prompt, "utf8");
  writeFileSync(
    join(dir, `run-${runK}.inventory.json`),
    `${JSON.stringify(assembled.inventory, null, 2)}\n`,
    "utf8",
  );
  return { promptPath, outputPath, inventory: assembled.inventory };
}

export function dumpPackage(packageDir) {
  const files = readdirSync(packageDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name)
    .sort();
  return files
    .map(
      (file) =>
        `# ${basename(file)}\n\n${readFileSync(join(packageDir, file), "utf8").trim()}`,
    )
    .join("\n\n");
}

function findAsk(config, askN) {
  const asks = parseAsks(readFileSync(config.asks, "utf8"));
  const ask = asks.find((item) => item.n === Number(askN));
  if (!ask) throw new Error(`ask ${askN} not found in ${config.asks}`);
  return ask;
}

function gatherInstructions(config) {
  return [
    "Read the menu above against the ask.",
    "Select only the ghost node ids that are relevant.",
    `Before generating, run: ${config.ghostBin} pull <ids> --package ${config.package}`,
    "Use the pulled node bodies as steering context, then generate the artifact.",
  ].join("\n");
}

function section(title, body) {
  if (!body) return "";
  return `## ${title}\n\n${body}`;
}

function firstLine(body) {
  return (
    body
      .split(/\r?\n/)
      .find((line) => line.trim())
      ?.trim() ?? ""
  );
}

function inventoryFor(parts) {
  const inventory = {
    ballast: countWords(parts.ballast),
    brand: countWords(parts.brand),
    menu: countWords(parts.menu),
    ask: countWords(parts.ask),
  };
  inventory.total =
    inventory.ballast + inventory.brand + inventory.menu + inventory.ask;
  inventory.tokensEstimate = Math.round(inventory.total * 1.33);
  return inventory;
}

function countWords(text) {
  return (text.match(/\S+/gu) ?? []).length;
}

function htmlPath(config, arm, askN, runK) {
  return resolve(config.out, arm, `ask-${askN}`, `run-${runK}.html`);
}
