import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, relative } from "node:path";
import type {
  RegistryItem,
  VisualDrift,
  VisualScanConfig,
  RuleSeverity,
} from "../types.js";
import {
  createVisualHarness,
  resolveVisualConfig,
} from "./visual-harness.js";

export interface VisualScannerOptions {
  registryItems: RegistryItem[];
  consumerDir: string;
  componentDir: string;
  styleContent: string;
  consumerStyleContent: string;
  rules: Record<string, RuleSeverity>;
  ignore: string[];
  visual: VisualScanConfig;
  cwd: string;
}

function matchesIgnore(filePath: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    const regex = new RegExp(
      "^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$",
    );
    if (regex.test(filePath)) return true;
  }
  return false;
}

export async function scanVisual(
  options: VisualScannerOptions,
): Promise<VisualDrift[]> {
  const {
    registryItems,
    consumerDir,
    componentDir,
    styleContent,
    consumerStyleContent,
    rules,
    ignore,
    visual,
    cwd,
  } = options;

  const regressionSeverity = rules["visual-regression"] ?? "warn";
  const failureSeverity = rules["visual-render-failure"] ?? "warn";

  if (regressionSeverity === "off" && failureSeverity === "off") {
    return [];
  }

  const config = resolveVisualConfig(visual);
  const outputDir = resolve(cwd, config.outputDir);

  const uiItems = registryItems.filter((item) => item.type === "registry:ui");
  const fullComponentDir = resolve(consumerDir, componentDir);

  if (!existsSync(fullComponentDir)) {
    return [];
  }

  // Build list of components that have both registry and consumer versions
  const componentsToCompare: Array<{
    item: RegistryItem;
    registryContent: string;
    consumerContent: string;
    registryFile: string;
    consumerFile: string;
  }> = [];

  for (const item of uiItems) {
    for (const file of item.files) {
      if (!file.content) continue;

      const consumerFilePath = resolve(consumerDir, file.target);
      const relativePath = relative(consumerDir, consumerFilePath);

      if (matchesIgnore(relativePath, ignore)) continue;
      if (!existsSync(consumerFilePath)) continue;

      const consumerContent = await readFile(consumerFilePath, "utf-8");

      componentsToCompare.push({
        item,
        registryContent: file.content,
        consumerContent,
        registryFile: file.path,
        consumerFile: relativePath,
      });
    }
  }

  if (componentsToCompare.length === 0) {
    return [];
  }

  const harness = await createVisualHarness({
    registryItems,
    styleContent,
    consumerStyleContent,
    config,
    outputDir,
  });

  try {
    await harness.scaffold();

    for (const comp of componentsToCompare) {
      await harness.addComponent({
        name: comp.item.name,
        registrySource: comp.registryContent,
        consumerSource: comp.consumerContent,
        registryFile: comp.registryFile,
        consumerFile: comp.consumerFile,
      });
    }

    const results = await harness.renderAll();
    const drifts: VisualDrift[] = [];

    for (const result of results) {
      if (result.error) {
        if (failureSeverity !== "off") {
          drifts.push({
            component: result.component,
            rule: "visual-render-failure",
            severity: failureSeverity,
            message: `Component "${result.component}" failed to render: ${result.error}`,
            diffPercentage: -1,
            threshold: config.threshold,
            registryFile: result.registryFile,
            consumerFile: result.consumerFile,
            error: result.error,
          });
        }
        continue;
      }

      if (result.diffPercentage > config.threshold) {
        if (regressionSeverity !== "off") {
          drifts.push({
            component: result.component,
            rule: "visual-regression",
            severity: regressionSeverity,
            message: `Component "${result.component}" visual drift: ${result.diffPercentage.toFixed(1)}% pixel difference (threshold: ${config.threshold}%)`,
            diffPercentage: result.diffPercentage,
            threshold: config.threshold,
            registryFile: result.registryFile,
            consumerFile: result.consumerFile,
            diffImagePath: result.diffImagePath
              ? relative(cwd, result.diffImagePath)
              : undefined,
          });
        }
      }
    }

    return drifts;
  } finally {
    await harness.cleanup();
  }
}
