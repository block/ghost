import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, relative, basename } from "node:path";
import { createPatch } from "diff";
import type { RegistryItem, StructureDrift, RuleSeverity } from "../types.js";

export interface StructureScannerOptions {
  registryItems: RegistryItem[];
  consumerDir: string;
  componentDir: string;
  rules: Record<string, RuleSeverity>;
  ignore: string[];
}

function matchesIgnore(filePath: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    // Simple glob matching: support * wildcard
    const regex = new RegExp(
      "^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$",
    );
    if (regex.test(filePath)) return true;
  }
  return false;
}

function countDiffLines(diff: string): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const line of diff.split("\n")) {
    if (line.startsWith("+") && !line.startsWith("+++")) added++;
    if (line.startsWith("-") && !line.startsWith("---")) removed++;
  }
  return { added, removed };
}

export async function scanStructure(
  options: StructureScannerOptions,
): Promise<StructureDrift[]> {
  const { registryItems, consumerDir, componentDir, rules, ignore } = options;
  const drifts: StructureDrift[] = [];

  const uiItems = registryItems.filter((item) => item.type === "registry:ui");
  const fullComponentDir = resolve(consumerDir, componentDir);

  if (!existsSync(fullComponentDir)) {
    return [];
  }

  const divergenceSeverity = rules["structural-divergence"] ?? "error";
  const missingSeverity = rules["missing-component"] ?? "warn";

  for (const item of uiItems) {
    for (const file of item.files) {
      if (!file.content) continue;

      // Determine the expected consumer file path
      const targetPath = file.target;
      const consumerFilePath = resolve(consumerDir, targetPath);
      const relativePath = relative(consumerDir, consumerFilePath);

      if (matchesIgnore(relativePath, ignore)) continue;

      if (!existsSync(consumerFilePath)) {
        if (missingSeverity !== "off") {
          drifts.push({
            component: item.name,
            rule: "missing-component",
            severity: missingSeverity,
            message: `Component "${item.name}" not found at ${relativePath}`,
            linesAdded: 0,
            linesRemoved: 0,
            registryFile: file.path,
            consumerFile: relativePath,
          });
        }
        continue;
      }

      if (divergenceSeverity === "off") continue;

      const consumerContent = await readFile(consumerFilePath, "utf-8");
      const registryContent = file.content;

      // Normalize line endings
      const normalizedConsumer = consumerContent.replace(/\r\n/g, "\n").trimEnd();
      const normalizedRegistry = registryContent.replace(/\r\n/g, "\n").trimEnd();

      if (normalizedConsumer === normalizedRegistry) continue;

      const diff = createPatch(
        relativePath,
        normalizedRegistry,
        normalizedConsumer,
        "registry",
        "consumer",
      );

      const { added, removed } = countDiffLines(diff);

      drifts.push({
        component: item.name,
        rule: "structural-divergence",
        severity: divergenceSeverity,
        message: `Component "${item.name}" has diverged from registry (+${added}, -${removed})`,
        diff,
        linesAdded: added,
        linesRemoved: removed,
        registryFile: file.path,
        consumerFile: relativePath,
      });
    }
  }

  return drifts;
}
