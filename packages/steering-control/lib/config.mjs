import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const EXAMPLES = {
  package: '"package": "./.ghost"',
  asks: '"asks": "./asks.md"',
  ballast: '"ballast": "./ballast.md"',
  runsPerCell: '"runsPerCell": 5',
  arms: '"arms": { "naked": true, "dump": true, "gather": true }',
  out: '"out": "./out"',
  ghostBin: '"ghostBin": "ghost"',
  tells: '"tells": null',
};

export function loadConfig(dir = process.cwd()) {
  const configPath = resolve(dir, "eval.config.json");
  let raw;
  try {
    raw = readFileSync(configPath, "utf8");
  } catch {
    fail(`missing eval.config.json\nExample: ${EXAMPLES.package}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    fail(`invalid eval.config.json JSON: ${error.message}`);
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    fail("invalid config: expected an object");
  }

  requireString(parsed, "package");
  requireString(parsed, "asks");
  requireString(parsed, "ballast");
  if (
    parsed.runsPerCell !== undefined &&
    !positiveInteger(parsed.runsPerCell)
  ) {
    invalid("runsPerCell");
  }
  if (
    !parsed.arms ||
    typeof parsed.arms !== "object" ||
    Array.isArray(parsed.arms)
  ) {
    invalid("arms");
  }
  for (const [arm, value] of Object.entries(parsed.arms)) {
    if (!["naked", "dump", "gather", "dump-growth"].includes(arm)) {
      fail(`invalid arms.${arm}: unknown arm\nExample: ${EXAMPLES.arms}`);
    }
    if (
      value !== true &&
      (typeof value !== "object" || value === null || Array.isArray(value))
    ) {
      fail(
        `invalid arms.${arm}: expected true or an options object\nExample: ${EXAMPLES.arms}`,
      );
    }
    if (arm === "dump-growth" && typeof value === "object" && value !== null) {
      if (
        value.extraPackages !== undefined &&
        !stringArray(value.extraPackages)
      ) {
        fail(
          'invalid arms.dump-growth.extraPackages\nExample: "extraPackages": ["../other/.ghost"]',
        );
      }
      if (value.asks !== undefined && !value.asks.every?.(positiveInteger)) {
        fail('invalid arms.dump-growth.asks\nExample: "asks": [1, 2]');
      }
    }
  }
  if (parsed.out !== undefined && typeof parsed.out !== "string")
    invalid("out");
  if (parsed.ghostBin !== undefined && typeof parsed.ghostBin !== "string")
    invalid("ghostBin");
  if (
    parsed.tells !== undefined &&
    parsed.tells !== null &&
    typeof parsed.tells !== "string"
  )
    invalid("tells");

  const base = dirname(configPath);
  const arms = { ...parsed.arms };
  if (arms["dump-growth"] && typeof arms["dump-growth"] === "object") {
    arms["dump-growth"] = {
      ...arms["dump-growth"],
      extraPackages: (arms["dump-growth"].extraPackages ?? []).map((p) =>
        resolve(base, p),
      ),
    };
  }

  return {
    ...parsed,
    configPath,
    configDir: base,
    package: resolve(base, parsed.package),
    asks: resolve(base, parsed.asks),
    ballast: resolve(base, parsed.ballast),
    runsPerCell: parsed.runsPerCell ?? 5,
    arms,
    tells:
      parsed.tells === undefined || parsed.tells === null
        ? null
        : resolve(base, parsed.tells),
    out: resolve(base, parsed.out ?? "./out"),
    ghostBin: parsed.ghostBin ?? "ghost",
  };
}

function requireString(obj, field) {
  if (typeof obj[field] !== "string" || obj[field].trim() === "")
    invalid(field);
}
function invalid(field) {
  fail(`missing/invalid field: ${field}\nExample: ${EXAMPLES[field]}`);
}
function fail(message) {
  throw new Error(`steering-control config error: ${message}`);
}
function positiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}
function stringArray(value) {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}
