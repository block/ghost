import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { diff } from "../src/diff.js";
import type { GhostConfig } from "../src/types.js";
import { CLEAN_DIR, DRIFTED_DIR, REGISTRY_PATH } from "./helpers/fixtures.js";

const defaultRules = {
  "hardcoded-color": "error" as const,
  "token-override": "warn" as const,
  "missing-token": "warn" as const,
  "structural-divergence": "error" as const,
  "missing-component": "warn" as const,
};

function makeConfig(consumerDir: string): GhostConfig {
  return {
    designSystems: [
      {
        name: "test-ds",
        registry: REGISTRY_PATH,
        componentDir: "components/ui",
        styleEntry: resolve(consumerDir, "src/styles/main.css"),
      },
    ],
    scan: { values: true, structure: true, visual: false, analysis: false },
    rules: defaultRules,
    ignore: [],
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("diff with clean consumer", () => {
  it("returns zero diverged and zero missing", async () => {
    vi.spyOn(process, "cwd").mockReturnValue(CLEAN_DIR);
    const config = makeConfig(CLEAN_DIR);
    const results = await diff(config);

    expect(results).toHaveLength(1);
    expect(results[0].summary.diverged).toBe(0);
    expect(results[0].summary.missing).toBe(0);
  });
});

describe("diff with drifted consumer", () => {
  it("detects structural divergence", async () => {
    vi.spyOn(process, "cwd").mockReturnValue(DRIFTED_DIR);
    const config = makeConfig(DRIFTED_DIR);
    const results = await diff(config);

    expect(results[0].summary.diverged).toBeGreaterThan(0);
  });

  it("detects missing components", async () => {
    vi.spyOn(process, "cwd").mockReturnValue(DRIFTED_DIR);
    const config = makeConfig(DRIFTED_DIR);
    const results = await diff(config);

    expect(results[0].summary.missing).toBeGreaterThan(0);
  });

  it("groups token drifts under _tokens component", async () => {
    vi.spyOn(process, "cwd").mockReturnValue(DRIFTED_DIR);
    const config = makeConfig(DRIFTED_DIR);
    const results = await diff(config);

    const tokenComponent = results[0].components.find(
      (c) => c.component === "_tokens",
    );
    expect(tokenComponent).toBeDefined();
    expect(tokenComponent!.valueDrifts.length).toBeGreaterThan(0);
  });

  it("classifies drift severity", async () => {
    vi.spyOn(process, "cwd").mockReturnValue(DRIFTED_DIR);
    const config = makeConfig(DRIFTED_DIR);
    const results = await diff(config);

    for (const comp of results[0].components) {
      expect(["info", "warn", "error"]).toContain(comp.severity);
      expect(["cosmetic", "additive", "breaking", "missing"]).toContain(
        comp.classification,
      );
    }
  });
});
