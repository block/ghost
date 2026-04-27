import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { GhostConfig, Target } from "@ghost/core";
import { resolveTarget } from "@ghost/core";
import { createJiti } from "jiti";

export { resolveTarget };

const CONFIG_FILES = ["ghost.config.ts", "ghost.config.js", "ghost.config.mjs"];

const DEFAULT_CONFIG: GhostConfig = {
  rules: {
    "hardcoded-color": "error",
    "token-override": "warn",
    "missing-token": "warn",
    "structural-divergence": "error",
    "missing-component": "warn",
  },
  ignore: [],
};

export function defineConfig(config: GhostConfig): GhostConfig {
  return config;
}

interface LoadConfigOptions {
  configPath?: string;
  cwd?: string;
}

async function resolveConfigFile(
  configPath: string | undefined,
  cwd: string,
): Promise<string | null> {
  if (configPath) {
    const resolved = resolve(cwd, configPath);
    if (!existsSync(resolved)) {
      throw new Error(`Config file not found: ${resolved}`);
    }
    return resolved;
  }

  for (const file of CONFIG_FILES) {
    const candidate = resolve(cwd, file);
    if (existsSync(candidate)) return candidate;
  }

  // Config is optional — return null if not found
  return null;
}

function normalizeTracked(
  value: Target | string | undefined,
): Target | undefined {
  if (!value) return undefined;
  if (typeof value === "string") {
    return resolveTarget(value);
  }
  return value;
}

function mergeDefaults(raw: GhostConfig): GhostConfig {
  return {
    targets: raw.targets,
    tracks: normalizeTracked(raw.tracks as Target | string | undefined),
    rules: { ...DEFAULT_CONFIG.rules, ...raw.rules },
    ignore: raw.ignore ?? DEFAULT_CONFIG.ignore,
    embedding: raw.embedding,
    extractors: raw.extractors,
  };
}

/**
 * Load the ghost config file. Returns defaults if no config file exists.
 */
export async function loadConfig(
  configPathOrOptions?: string | LoadConfigOptions,
  cwd: string = process.cwd(),
): Promise<GhostConfig> {
  let configPath: string | undefined;

  if (typeof configPathOrOptions === "object") {
    configPath = configPathOrOptions.configPath;
    cwd = configPathOrOptions.cwd ?? cwd;
  } else {
    configPath = configPathOrOptions;
  }

  const resolvedPath = await resolveConfigFile(configPath, cwd);

  if (!resolvedPath) {
    // No config file found — return defaults (zero-config mode)
    return { ...DEFAULT_CONFIG };
  }

  const jiti = createJiti(resolvedPath);
  const mod = await jiti.import(resolvedPath);
  const raw =
    (mod as { default?: GhostConfig }).default ?? (mod as GhostConfig);

  return mergeDefaults(raw);
}
