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
 * Resolve a target string into a typed Target.
 *
 * Explicit prefixes (recommended):
 *   github:owner/repo    → GitHub clone
 *   npm:package-name     → npm pack
 *   figma:file-url       → Figma API
 *
 * Unambiguous patterns (no prefix needed):
 *   /absolute/path       → local path
 *   ./relative/path      → local path
 *   ../parent/path       → local path
 *   https://...          → URL
 *
 * Ambiguous inputs without a prefix will throw an error
 * with a suggestion to use a prefix.
 */
export function resolveTarget(input: string): Target {
  // Explicit prefixes — unambiguous, preferred
  const prefixMatch = input.match(/^(github|npm|figma|path|url):(.+)$/);
  if (prefixMatch) {
    const [, prefix, value] = prefixMatch;
    return { type: prefix as Target["type"], value };
  }

  // Unambiguous: absolute or relative paths
  if (input.startsWith("/") || input.startsWith("./") || input.startsWith("../")) {
    return { type: "path", value: input };
  }

  // Unambiguous: exists as local path
  if (existsSync(resolve(process.cwd(), input))) {
    return { type: "path", value: input };
  }

  // Unambiguous: URLs
  if (input.startsWith("http://") || input.startsWith("https://")) {
    if (input.includes("figma.com")) {
      return { type: "figma", value: input };
    }
    return { type: "url", value: input };
  }

  // Unambiguous: npm scoped packages (@scope/name)
  if (input.startsWith("@") && input.includes("/")) {
    return { type: "npm", value: input };
  }

  // Ambiguous — require a prefix
  const suggestions: string[] = [];
  if (input.includes("/")) {
    suggestions.push(`  github:${input}    (GitHub repo)`);
    suggestions.push(`  path:${input}      (local path)`);
  } else {
    suggestions.push(`  npm:${input}       (npm package)`);
    suggestions.push(`  github:owner/${input}  (GitHub repo)`);
  }

  throw new Error(
    `Ambiguous target "${input}". Use an explicit prefix:\n${suggestions.join("\n")}`,
  );
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
