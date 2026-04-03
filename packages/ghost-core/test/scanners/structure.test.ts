import { describe, it, expect } from "vitest";
import { resolve } from "node:path";
import { resolveRegistry } from "../../src/resolvers/registry.js";
import { scanStructure } from "../../src/scanners/structure.js";

const registryPath = resolve(__dirname, "../fixtures/registry/registry.json");
const cleanDir = resolve(__dirname, "../fixtures/consumer-clean");
const driftedDir = resolve(__dirname, "../fixtures/consumer-drifted");

const defaultRules = {
  "structural-divergence": "error" as const,
  "missing-component": "warn" as const,
};

describe("scanStructure - clean consumer", () => {
  it("reports no drift for identical components", async () => {
    const registry = await resolveRegistry(registryPath);
    const results = await scanStructure({
      registryItems: registry.items,
      consumerDir: cleanDir,
      componentDir: "components/ui",
      rules: defaultRules,
      ignore: [],
    });

    expect(results).toHaveLength(0);
  });
});

describe("scanStructure - drifted consumer", () => {
  it("detects modified components", async () => {
    const registry = await resolveRegistry(registryPath);
    const results = await scanStructure({
      registryItems: registry.items,
      consumerDir: driftedDir,
      componentDir: "components/ui",
      rules: defaultRules,
      ignore: [],
    });

    const modified = results.filter((r) => r.rule === "structural-divergence");
    expect(modified.length).toBeGreaterThan(0);

    const buttonDrift = modified.find((r) => r.component === "button");
    expect(buttonDrift).toBeDefined();
    expect(buttonDrift!.linesAdded).toBeGreaterThan(0);
    expect(buttonDrift!.diff).toBeDefined();
  });

  it("detects missing components", async () => {
    const registry = await resolveRegistry(registryPath);
    const results = await scanStructure({
      registryItems: registry.items,
      consumerDir: driftedDir,
      componentDir: "components/ui",
      rules: defaultRules,
      ignore: [],
    });

    const missing = results.filter((r) => r.rule === "missing-component");
    expect(missing.length).toBeGreaterThan(0);

    const cardMissing = missing.find((r) => r.component === "card");
    expect(cardMissing).toBeDefined();
  });

  it("respects ignore patterns", async () => {
    const registry = await resolveRegistry(registryPath);
    const results = await scanStructure({
      registryItems: registry.items,
      consumerDir: driftedDir,
      componentDir: "components/ui",
      rules: defaultRules,
      ignore: ["components/ui/button.tsx", "components/ui/card.tsx"],
    });

    expect(results).toHaveLength(0);
  });
});
