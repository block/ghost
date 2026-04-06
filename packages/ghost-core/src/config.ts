import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { createJiti } from "jiti";
import type { GhostConfig } from "./types.js";

const CONFIG_FILES = ["ghost.config.ts", "ghost.config.js", "ghost.config.mjs"];

const DEFAULT_CONFIG: Omit<GhostConfig, "designSystems"> = {
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

interface LoadConfigOptions {
  configPath?: string;
  cwd?: string;
  requireDesignSystems?: boolean;
}

async function resolveConfigFile(
  configPath: string | undefined,
  cwd: string,
): Promise<string> {
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

  throw new Error(
    `No ghost config found. Create one of: ${CONFIG_FILES.join(", ")}`,
  );
}

function validateDesignSystems(raw: GhostConfig): void {
  if (!raw.designSystems || !Array.isArray(raw.designSystems)) {
    throw new Error("Config must include a designSystems array");
  }

  for (const ds of raw.designSystems) {
    if (!ds.name) throw new Error("Each design system must have a name");
    if (!ds.registry)
      throw new Error(
        `Design system "${ds.name}" must have a registry path or URL`,
      );
    if (!ds.componentDir)
      throw new Error(`Design system "${ds.name}" must have a componentDir`);
    if (!ds.styleEntry)
      throw new Error(`Design system "${ds.name}" must have a styleEntry`);
  }
}

function mergeDefaults(raw: GhostConfig): GhostConfig {
  return {
    designSystems: raw.designSystems,
    scan: { ...DEFAULT_CONFIG.scan, ...raw.scan },
    rules: { ...DEFAULT_CONFIG.rules, ...raw.rules },
    ignore: raw.ignore ?? DEFAULT_CONFIG.ignore,
    visual: raw.visual,
    llm: raw.llm,
    embedding: raw.embedding,
    extractors: raw.extractors,
  };
}

export async function loadConfig(
  configPathOrOptions?: string | LoadConfigOptions,
  cwd: string = process.cwd(),
): Promise<GhostConfig> {
  let configPath: string | undefined;
  let requireDesignSystems = true;

  if (typeof configPathOrOptions === "object") {
    configPath = configPathOrOptions.configPath;
    cwd = configPathOrOptions.cwd ?? cwd;
    requireDesignSystems = configPathOrOptions.requireDesignSystems ?? true;
  } else {
    configPath = configPathOrOptions;
  }

  const resolvedPath = await resolveConfigFile(configPath, cwd);

  const jiti = createJiti(resolvedPath);
  const mod = await jiti.import(resolvedPath);
  const raw =
    (mod as { default?: GhostConfig }).default ?? (mod as GhostConfig);

  if (requireDesignSystems) {
    validateDesignSystems(raw);
  }

  return mergeDefaults(raw);
}
