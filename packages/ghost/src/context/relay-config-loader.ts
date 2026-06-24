import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { defaultGhostRelayConfig } from "./default-relay-config.js";
import {
  GHOST_RELAY_CONFIG_SCHEMA,
  type GhostRelayConfig,
  type ResolvedGhostRelayConfig,
  validateGhostRelayConfig,
} from "./relay-config.js";

export interface LoadGhostRelayConfigOptions {
  cwd: string;
  root: string;
  explicitPath?: string;
  ghostDir: string;
  packageDir?: string;
}

export async function loadGhostRelayConfig(
  options: LoadGhostRelayConfigOptions,
): Promise<ResolvedGhostRelayConfig> {
  const explicit = options.explicitPath
    ? resolve(options.cwd, options.explicitPath)
    : undefined;
  const discovered =
    explicit ??
    (await firstExistingPath([
      options.packageDir ? resolve(options.packageDir, "relay.yml") : "",
      resolve(options.root, options.ghostDir, "relay.yml"),
    ]));

  if (!discovered) {
    return {
      config: defaultGhostRelayConfig(),
      source: "default",
      root: options.root,
    };
  }

  const raw = await readFile(discovered, "utf-8");
  const parsed = parseRelayConfigYaml(raw, discovered);
  const errors = validateGhostRelayConfig(parsed);
  if (errors.length > 0) {
    throw new Error(
      `Invalid Ghost Relay config ${discovered}:\n${errors
        .map((error) => `  - ${error}`)
        .join("\n")}`,
    );
  }

  return {
    config: parsed,
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
      // Keep discovery quiet; missing optional config files fall back.
    }
  }
  return undefined;
}

function parseRelayConfigYaml(raw: string, path: string): GhostRelayConfig {
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
    throw new Error(
      `${path} must contain a ${GHOST_RELAY_CONFIG_SCHEMA} object.`,
    );
  }
  return parsed as GhostRelayConfig;
}
