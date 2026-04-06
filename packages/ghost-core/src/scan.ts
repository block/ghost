import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseCSS } from "./resolvers/css.js";
import { resolveRegistry } from "./resolvers/registry.js";
import { scanStructure } from "./scanners/structure.js";
import { scanValues } from "./scanners/values.js";
import { scanVisual } from "./scanners/visual.js";
import type {
  DesignSystemReport,
  DriftReport,
  DriftSummary,
  GhostConfig,
  StructureDrift,
  ValueDrift,
  VisualDrift,
} from "./types.js";

export async function scan(
  config: GhostConfig,
  cwd: string = process.cwd(),
): Promise<DriftReport> {
  const systems: DesignSystemReport[] = [];
  let totalTokensScanned = 0;
  let totalComponentsScanned = 0;

  if (!config.designSystems?.length) {
    throw new Error(
      "scan() requires at least one design system in config.designSystems",
    );
  }

  for (const ds of config.designSystems) {
    const registry = await resolveRegistry(ds.registry);

    let values: ValueDrift[] = [];
    let structure: StructureDrift[] = [];
    let visual: VisualDrift[] = [];

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

    // Visual scan
    if (config.scan.visual) {
      const styleItem = registry.items.find((i) => i.type === "registry:style");
      const registryCSS = styleItem?.files[0]?.content ?? "";
      const consumerCSS = existsSync(resolve(cwd, ds.styleEntry))
        ? await readFile(resolve(cwd, ds.styleEntry), "utf-8")
        : "";

      visual = await scanVisual({
        registryItems: registry.items,
        consumerDir: cwd,
        componentDir: ds.componentDir,
        styleContent: registryCSS,
        consumerStyleContent: consumerCSS,
        rules: config.rules,
        ignore: config.ignore,
        visual: config.visual ?? {},
        cwd,
      });
    }

    systems.push({
      designSystem: ds.name,
      values,
      structure,
      visual,
    });
  }

  const summary = computeSummary(
    systems,
    totalTokensScanned,
    totalComponentsScanned,
  );

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
    for (const v of system.visual) {
      if (v.severity === "error") errors++;
      else if (v.severity === "warn") warnings++;
      else info++;
    }
  }

  return { errors, warnings, info, tokensScanned, componentsScanned };
}
