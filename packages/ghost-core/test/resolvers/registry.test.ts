import { describe, it, expect } from "vitest";
import { resolve } from "node:path";
import { resolveRegistry } from "../../src/resolvers/registry.js";

const registryPath = resolve(__dirname, "../fixtures/registry/registry.json");

describe("resolveRegistry (local)", () => {
  it("loads registry metadata", async () => {
    const registry = await resolveRegistry(registryPath);
    expect(registry.name).toBe("test-ds");
    expect(registry.items.length).toBe(4);
  });

  it("resolves component content from out/r/ files", async () => {
    const registry = await resolveRegistry(registryPath);
    const button = registry.items.find((i) => i.name === "button");
    expect(button).toBeDefined();
    expect(button!.files[0].content).toBeDefined();
    expect(button!.files[0].content).toContain("buttonVariants");
  });

  it("resolves style content and extracts tokens", async () => {
    const registry = await resolveRegistry(registryPath);
    expect(registry.tokens.length).toBeGreaterThan(0);

    const bgDefault = registry.tokens.find((t) => t.name === "--background-default");
    expect(bgDefault).toBeDefined();
  });

  it("preserves registry dependencies", async () => {
    const registry = await resolveRegistry(registryPath);
    const button = registry.items.find((i) => i.name === "button");
    expect(button!.registryDependencies).toContain("utils");
  });
});
