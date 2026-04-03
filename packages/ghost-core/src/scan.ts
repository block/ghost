import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import type {
  GhostConfig,
  DriftReport,
  DesignSystemReport,
  DriftSummary,
  ValueDrift,
  StructureDrift,
} from "./types.js";
import { resolveRegistry } from "./resolvers/registry.js";
import { parseCSS } from "./resolvers/css.js";
import { scanValues } from "./scanners/values.js";
import { scanStructure } from "./scanners/structure.js";

export async function scan(
  config: GhostConfig,
  cwd: string = process.cwd(),
): Promise<DriftReport> {
  const systems: DesignSystemReport[] = [];
  let totalTokensScanned = 0;
  let totalComponentsScanned = 0;

  for (const ds of config.designSystems) {
    const registry = await resolveRegistry(ds.registry);

    let values: ValueDrift[] = [];
    let structure: StructureDrift[] = [];

    // Values scan
    if (config.scan.values) {
      const styleEntryPath = resolve(cwd, ds.styleEntry);
      if (existsSync(styleEntryPath)) {
        const consumerCSS = await readFile(styleEntryPath, "utf-8");
        const consumerTokens = parseCSS(consumerCSS);
        totalTokensScanned += consumerTokens.length;

        values = scanValues({
          registryTokens: registry.tokens,
          consumerTokens,
          consumerCSS,
          rules: config.rules,
          styleFile: ds.styleEntry,
        });
      }
    }

    // Structure scan
    if (config.scan.structure) {
      const uiItems = registry.items.filter((i) => i.type === "registry:ui");
      totalComponentsScanned += uiItems.length;

      structure = await scanStructure({
        registryItems: registry.items,
        consumerDir: cwd,
        componentDir: ds.componentDir,
        rules: config.rules,
        ignore: config.ignore,
      });
    }

    systems.push({
      designSystem: ds.name,
      values,
      structure,
    });
  }

  const summary = computeSummary(systems, totalTokensScanned, totalComponentsScanned);

  return {
    timestamp: new Date().toISOString(),
    systems,
    summary,
  };
}

function computeSummary(
  systems: DesignSystemReport[],
  tokensScanned: number,
  componentsScanned: number,
): DriftSummary {
  let errors = 0;
  let warnings = 0;
  let info = 0;

  for (const system of systems) {
    for (const v of system.values) {
      if (v.severity === "error") errors++;
      else if (v.severity === "warn") warnings++;
      else info++;
    }
    for (const s of system.structure) {
      if (s.severity === "error") errors++;
      else if (s.severity === "warn") warnings++;
      else info++;
    }
  }

  return { errors, warnings, info, tokensScanned, componentsScanned };
}
