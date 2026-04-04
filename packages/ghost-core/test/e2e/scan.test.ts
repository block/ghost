import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { scan } from "../../src/scan.js";
import type { GhostConfig } from "../../src/types.js";

const registryPath = resolve(__dirname, "../fixtures/registry/registry.json");

function makeConfig(consumerDir: string): GhostConfig {
  return {
    designSystems: [
      {
        name: "test-ds",
        registry: registryPath,
        componentDir: "components/ui",
        styleEntry: resolve(consumerDir, "src/styles/main.css"),
      },
    ],
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
}

describe("scan() e2e - clean consumer", () => {
  it("reports zero errors and warnings for clean consumer", async () => {
    const cleanDir = resolve(__dirname, "../fixtures/consumer-clean");
    const config = makeConfig(cleanDir);
    const report = await scan(config, cleanDir);

    expect(report.summary.errors).toBe(0);
    expect(report.summary.warnings).toBe(0);
    expect(report.systems).toHaveLength(1);
    expect(report.systems[0].designSystem).toBe("test-ds");
  });
});

describe("scan() e2e - drifted consumer", () => {
  it("detects all forms of drift", async () => {
    const driftedDir = resolve(__dirname, "../fixtures/consumer-drifted");
    const config = makeConfig(driftedDir);
    const report = await scan(config, driftedDir);

    expect(report.summary.errors).toBeGreaterThan(0);
    expect(report.summary.warnings).toBeGreaterThan(0);

    const system = report.systems[0];
    expect(system.values.length).toBeGreaterThan(0);
    expect(system.structure.length).toBeGreaterThan(0);
  });

  it("includes timestamp", async () => {
    const driftedDir = resolve(__dirname, "../fixtures/consumer-drifted");
    const config = makeConfig(driftedDir);
    const report = await scan(config, driftedDir);

    expect(report.timestamp).toBeDefined();
    expect(new Date(report.timestamp).getTime()).not.toBeNaN();
  });
});
