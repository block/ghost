import { createJiti } from "jiti";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import type { GhostConfig } from "./types.js";

const CONFIG_FILES = [
  "ghost.config.ts",
  "ghost.config.js",
  "ghost.config.mjs",
];

const DEFAULT_CONFIG: Omit<GhostConfig, "designSystems"> = {
  scan: { values: true, structure: true, analysis: false },
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

export async function loadConfig(
  configPath?: string,
  cwd: string = process.cwd(),
): Promise<GhostConfig> {
  let resolvedPath: string | undefined;

  if (configPath) {
    resolvedPath = resolve(cwd, configPath);
    if (!existsSync(resolvedPath)) {
      throw new Error(`Config file not found: ${resolvedPath}`);
    }
  } else {
    for (const file of CONFIG_FILES) {
      const candidate = resolve(cwd, file);
      if (existsSync(candidate)) {
        resolvedPath = candidate;
        break;
      }
    }
    if (!resolvedPath) {
      throw new Error(
        `No ghost config found. Create one of: ${CONFIG_FILES.join(", ")}`,
      );
    }
  }

  const jiti = createJiti(resolvedPath);
  const mod = await jiti.import(resolvedPath);
  const raw = (mod as { default?: GhostConfig }).default ?? (mod as GhostConfig);

  if (!raw.designSystems || !Array.isArray(raw.designSystems)) {
    throw new Error("Config must include a designSystems array");
  }

  for (const ds of raw.designSystems) {
    if (!ds.name) throw new Error("Each design system must have a name");
    if (!ds.registry) throw new Error(`Design system "${ds.name}" must have a registry path or URL`);
    if (!ds.componentDir) throw new Error(`Design system "${ds.name}" must have a componentDir`);
    if (!ds.styleEntry) throw new Error(`Design system "${ds.name}" must have a styleEntry`);
  }

  return {
    designSystems: raw.designSystems,
    scan: { ...DEFAULT_CONFIG.scan, ...raw.scan },
    rules: { ...DEFAULT_CONFIG.rules, ...raw.rules },
    ignore: raw.ignore ?? DEFAULT_CONFIG.ignore,
  };
}
