import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { defineConfig, loadConfig } from "../src/config.js";
import { CLEAN_DIR } from "./helpers/fixtures.js";

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "ghost-test-config-"));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("defineConfig", () => {
  it("returns the config object unchanged", () => {
    const config = {
      designSystems: [],
      scan: { values: true, structure: true, visual: false, analysis: false },
      rules: {},
      ignore: [],
    };
    expect(defineConfig(config)).toBe(config);
  });
});

describe("loadConfig", () => {
  it("loads config from consumer-clean fixture", async () => {
    const config = await loadConfig(undefined, CLEAN_DIR);

    expect(config).toBeDefined();
    expect(config.designSystems).toBeDefined();
    expect(config.designSystems!.length).toBeGreaterThan(0);
    expect(config.designSystems![0].name).toBe("test-ds");
  });

  it("merges defaults for missing fields", async () => {
    const config = await loadConfig(undefined, CLEAN_DIR);

    // Default rules should be merged in
    expect(config.rules["hardcoded-color"]).toBeDefined();
    expect(config.scan.values).toBe(true);
    expect(config.ignore).toBeDefined();
  });

  it("throws when no config file found", async () => {
    await expect(loadConfig(undefined, tempDir)).rejects.toThrow(
      "No ghost config found",
    );
  });

  it("throws for non-existent explicit config path", async () => {
    await expect(
      loadConfig("nonexistent.config.ts", tempDir),
    ).rejects.toThrow("Config file not found");
  });

  it("allows missing designSystems when requireDesignSystems is false", async () => {
    // Write a minimal config without designSystems
    const { writeFile } = await import("node:fs/promises");
    await writeFile(
      join(tempDir, "ghost.config.ts"),
      `export default { scan: { values: true, structure: true, visual: false, analysis: false }, rules: {}, ignore: [] }`,
    );

    const config = await loadConfig(
      { cwd: tempDir, requireDesignSystems: false },
    );
    expect(config).toBeDefined();
  });
});
