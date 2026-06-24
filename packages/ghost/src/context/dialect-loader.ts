import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { defaultGhostDialect } from "./default-dialect.js";
import {
  GHOST_DIALECT_SCHEMA,
  type GhostDialect,
  type ResolvedGhostDialect,
  validateGhostDialect,
} from "./dialect.js";

export interface LoadGhostDialectOptions {
  cwd: string;
  root: string;
  explicitPath?: string;
  ghostDir: string;
  packageDir?: string;
}

export async function loadGhostDialect(
  options: LoadGhostDialectOptions,
): Promise<ResolvedGhostDialect> {
  const explicit = options.explicitPath
    ? resolve(options.cwd, options.explicitPath)
    : undefined;
  const discovered =
    explicit ??
    (await firstExistingPath([
      options.packageDir ? resolve(options.packageDir, "dialect.yml") : "",
      resolve(options.root, options.ghostDir, "dialect.yml"),
    ]));

  if (!discovered) {
    return {
      dialect: defaultGhostDialect(),
      source: "default",
      root: options.root,
    };
  }

  const raw = await readFile(discovered, "utf-8");
  const parsed = parseDialectYaml(raw, discovered);
  const errors = validateGhostDialect(parsed);
  if (errors.length > 0) {
    throw new Error(
      `Invalid Ghost dialect ${discovered}:\n${errors
        .map((error) => `  - ${error}`)
        .join("\n")}`,
    );
  }

  return {
    dialect: parsed,
    source: "file",
    path: discovered,
    root: options.root,
  };
}

async function firstExistingPath(paths: string[]): Promise<string | undefined> {
  for (const path of paths) {
    if (!path) continue;
    try {
      await access(path);
      return path;
    } catch {
      // Keep discovery quiet; missing optional dialect files fall back.
    }
  }
  return undefined;
}

function parseDialectYaml(raw: string, path: string): GhostDialect {
  let parsed: unknown;
  try {
    parsed = parseYaml(raw);
  } catch (err) {
    throw new Error(
      `${path} is not valid YAML: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error(`${path} must contain a ${GHOST_DIALECT_SCHEMA} object.`);
  }
  return parsed as GhostDialect;
}
