import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { createJiti } from "jiti";
import type { GhostConfig, Target } from "./types.js";

const CONFIG_FILES = ["ghost.config.ts", "ghost.config.js", "ghost.config.mjs"];

const DEFAULT_CONFIG: GhostConfig = {
  scan: { values: true, structure: true, visual: false, analysis: false },
  rules: {
    "hardcoded-color": "error",
    "token-override": "warn",
    "missing-token": "warn",
    "structural-divergence": "error",
    "missing-component": "warn",
    "visual-regression": "warn",
    "visual-render-failure": "warn",
  },
  ignore: [],
};

export function defineConfig(config: GhostConfig): GhostConfig {
  return config;
}

/**
 * Auto-detect a Target from a string input.
 *
 * - starts with / or ./ or ../ → path
 * - exists as a local path → path
 * - starts with http(s):// → url
 * - contains figma.com → figma
 * - matches owner/repo pattern (single slash, no dots) → github
 * - starts with @ or plain word → npm
 */
export function resolveTarget(input: string): Target {
  // Explicit path prefixes
  if (input.startsWith("/") || input.startsWith("./") || input.startsWith("../")) {
    return { type: "path", value: input };
  }

  // Check if it exists as a local path (handles "packages/foo", "src/styles", etc.)
  if (existsSync(resolve(process.cwd(), input))) {
    return { type: "path", value: input };
  }

  // URLs
  if (input.startsWith("http://") || input.startsWith("https://")) {
    if (input.includes("figma.com")) {
      return { type: "figma", value: input };
    }
    return { type: "url", value: input };
  }

  // npm scoped packages
  if (input.startsWith("@")) {
    return { type: "npm", value: input };
  }

  // GitHub: owner/repo pattern — single slash, no dots in path segments
  if (input.includes("/") && !input.includes(".") && input.split("/").length === 2) {
    return { type: "github", value: input };
  }

  // Plain word → npm
  if (!input.includes("/")) {
    return { type: "npm", value: input };
  }

  // Fallback: treat as path
  return { type: "path", value: input };
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

function normalizeParent(
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
    parent: normalizeParent(raw.parent as Target | string | undefined),
    scan: { ...DEFAULT_CONFIG.scan, ...raw.scan },
    rules: { ...DEFAULT_CONFIG.rules, ...raw.rules },
    ignore: raw.ignore ?? DEFAULT_CONFIG.ignore,
    visual: raw.visual,
    llm: raw.llm,
    embedding: raw.embedding,
    extractors: raw.extractors,
    agents: raw.agents,
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
