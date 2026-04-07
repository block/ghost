import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseCSS } from "./resolvers/css.js";
import { resolveRegistry } from "./resolvers/registry.js";
import { scanStructure } from "./scanners/structure.js";
import { scanValues } from "./scanners/values.js";
import type { GhostConfig, StructureDrift, ValueDrift } from "./types.js";

export type DiffSeverity = "info" | "warn" | "error";

export interface ComponentDiff {
  component: string;
  severity: DiffSeverity;
  structureDrift?: StructureDrift;
  valueDrifts: ValueDrift[];
  classification: "cosmetic" | "additive" | "breaking" | "missing";
}

export interface DiffResult {
  designSystem: string;
  components: ComponentDiff[];
  summary: {
    total: number;
    missing: number;
    diverged: number;
    clean: number;
    tokenDrifts: number;
  };
}

function classifyStructureDrift(
  drift: StructureDrift,
): "cosmetic" | "additive" | "breaking" {
  if (!drift.diff) return "cosmetic";

  const lines = drift.diff.split("\n");
  let hasRemovedExport = false;
  let hasRemovedProp = false;
  let onlyWhitespace = true;

  for (const line of lines) {
    if (line.startsWith("-") && !line.startsWith("---")) {
      const content = line.slice(1).trim();
      if (content.length > 0) onlyWhitespace = false;
      if (content.startsWith("export ")) hasRemovedExport = true;
      if (content.includes("Props") || content.includes("interface "))
        hasRemovedProp = true;
    }
    if (line.startsWith("+") && !line.startsWith("+++")) {
      const content = line.slice(1).trim();
      if (content.length > 0) onlyWhitespace = false;
    }
  }

  if (onlyWhitespace) return "cosmetic";
  if (hasRemovedExport || hasRemovedProp) return "breaking";
  return "additive";
}

function classificationToSeverity(
  classification: ComponentDiff["classification"],
): DiffSeverity {
  switch (classification) {
    case "cosmetic":
      return "info";
    case "additive":
      return "warn";
    case "breaking":
    case "missing":
      return "error";
  }
}

export async function diff(
  config: GhostConfig,
  componentFilter?: string,
): Promise<DiffResult[]> {
  const results: DiffResult[] = [];

  for (const ds of config.designSystems ?? []) {
    const registry = await resolveRegistry(ds.registry);
    const consumerDir = process.cwd();

    // Structure scan
    const structureDrifts = await scanStructure({
      registryItems: registry.items,
      consumerDir,
      componentDir: ds.componentDir,
      rules: config.rules,
      ignore: config.ignore,
    });

    // Value scan
    let valueDrifts: ValueDrift[] = [];
    const styleEntryPath = resolve(consumerDir, ds.styleEntry);
    if (existsSync(styleEntryPath)) {
      const consumerCSS = await readFile(styleEntryPath, "utf-8");
      const consumerTokens = parseCSS(consumerCSS);
      valueDrifts = scanValues({
        registryTokens: registry.tokens,
        consumerTokens,
        consumerCSS,
        rules: config.rules,
        styleFile: ds.styleEntry,
      });
    }

    // Group by component
    const componentMap = new Map<string, ComponentDiff>();

    // Process structure drifts
    for (const sd of structureDrifts) {
      if (componentFilter && sd.component !== componentFilter) continue;

      const classification =
        sd.rule === "missing-component"
          ? "missing"
          : classifyStructureDrift(sd);

      componentMap.set(sd.component, {
        component: sd.component,
        severity: classificationToSeverity(classification),
        structureDrift: sd,
        valueDrifts: [],
        classification,
      });
    }

    // Attach value drifts (these are token-level, not per-component)
    // Group them under a synthetic "_tokens" component
    if (valueDrifts.length > 0) {
      const tokenDiff: ComponentDiff = {
        component: "_tokens",
        severity: valueDrifts.some((v) => v.severity === "error")
          ? "error"
          : "warn",
        valueDrifts,
        classification: "additive",
      };
      componentMap.set("_tokens", tokenDiff);
    }

    // Count clean components
    const uiItems = registry.items.filter((i) => i.type === "registry:ui");
    const divergedComponents = new Set(structureDrifts.map((d) => d.component));
    const clean = componentFilter
      ? 0
      : uiItems.filter((i) => !divergedComponents.has(i.name)).length;

    results.push({
      designSystem: ds.name,
      components: Array.from(componentMap.values()),
      summary: {
        total: componentFilter ? 1 : uiItems.length,
        missing: structureDrifts.filter((d) => d.rule === "missing-component")
          .length,
        diverged: structureDrifts.filter(
          (d) => d.rule === "structural-divergence",
        ).length,
        clean,
        tokenDrifts: valueDrifts.length,
      },
    });
  }

  return results;
}
