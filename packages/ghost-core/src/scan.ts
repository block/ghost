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
  Target,
  ValueDrift,
  VisualDrift,
} from "./types.js";

export interface ScanTargetOptions {
  registry: string;
  componentDir: string;
  styleEntry: string;
  name?: string;
}

/**
 * Scan for design drift.
 *
 * Requires explicit scan targets (registry, componentDir, styleEntry).
 * These can come from config.targets or be passed directly.
 */
export async function scan(
  config: GhostConfig,
  cwd: string = process.cwd(),
  scanTargets?: ScanTargetOptions[],
): Promise<DriftReport> {
  // Build scan targets from config.targets or explicit parameter
  const targets = scanTargets ?? buildScanTargets(config);

  if (!targets.length) {
    throw new Error(
      "scan() requires at least one target with a registry. " +
        "Configure targets in ghost.config.ts or pass scanTargets directly.",
    );
  }

  const systems: DesignSystemReport[] = [];
  let totalTokensScanned = 0;
  let totalComponentsScanned = 0;

  for (const target of targets) {
    const registry = await resolveRegistry(target.registry);

    let values: ValueDrift[] = [];
    let structure: StructureDrift[] = [];
    let visual: VisualDrift[] = [];

    // Values scan
    if (config.scan.values) {
      const styleEntryPath = resolve(cwd, target.styleEntry);
      if (existsSync(styleEntryPath)) {
        const consumerCSS = await readFile(styleEntryPath, "utf-8");
        const consumerTokens = parseCSS(consumerCSS);
        totalTokensScanned += consumerTokens.length;

        values = scanValues({
          registryTokens: registry.tokens,
          consumerTokens,
          consumerCSS,
          rules: config.rules,
          styleFile: target.styleEntry,
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
        componentDir: target.componentDir,
        rules: config.rules,
        ignore: config.ignore,
      });
    }

    // Visual scan
    if (config.scan.visual) {
      const styleItem = registry.items.find((i) => i.type === "registry:style");
      const registryCSS = styleItem?.files[0]?.content ?? "";
      const consumerCSS = existsSync(resolve(cwd, target.styleEntry))
        ? await readFile(resolve(cwd, target.styleEntry), "utf-8")
        : "";

      visual = await scanVisual({
        registryItems: registry.items,
        consumerDir: cwd,
        componentDir: target.componentDir,
        styleContent: registryCSS,
        consumerStyleContent: consumerCSS,
        rules: config.rules,
        ignore: config.ignore,
        visual: config.visual ?? {},
        cwd,
      });
    }

    systems.push({
      designSystem: target.name ?? "unknown",
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

/**
 * Build ScanTargetOptions from config.targets.
 * Only targets that include registry/componentDir/styleEntry in options are usable for scanning.
 */
function buildScanTargets(config: GhostConfig): ScanTargetOptions[] {
  if (!config.targets?.length) return [];

  return config.targets
    .filter(
      (t): t is Target & { type: "registry" | "url" | "path" } =>
        t.type === "registry" || t.type === "url" || t.type === "path",
    )
    .map((t) => ({
      registry: t.value,
      componentDir: t.options?.branch ?? "components/ui",
      styleEntry: "src/styles/main.css",
      name: t.name ?? t.value,
    }));
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
