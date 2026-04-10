import { describe, expect, it } from "vitest";
import { fingerprintFromRegistry } from "../../src/fingerprint/from-registry.js";
import { resolveRegistry } from "../../src/resolvers/registry.js";
import { REGISTRY_PATH } from "../helpers/fixtures.js";

describe("fingerprintFromRegistry", () => {
  it("produces a valid DesignFingerprint from the test registry", async () => {
    const registry = await resolveRegistry(REGISTRY_PATH);
    const fp = fingerprintFromRegistry(registry);

    expect(fp.id).toBe("test-ds");
    expect(fp.source).toBe("registry");
    expect(fp.timestamp).toBeDefined();
    expect(fp.palette).toBeDefined();
    expect(fp.spacing).toBeDefined();
    expect(fp.typography).toBeDefined();
    expect(fp.surfaces).toBeDefined();
    expect(fp.architecture).toBeDefined();
    expect(fp.embedding).toBeDefined();
  });

  it("extracts semantic colors from :root tokens", async () => {
    const registry = await resolveRegistry(REGISTRY_PATH);
    const fp = fingerprintFromRegistry(registry);

    expect(fp.palette.semantic.length).toBeGreaterThan(0);
    const roles = fp.palette.semantic.map((c) => c.role);
    expect(roles).toContain("surface");
    expect(roles).toContain("text");
  });

  it("extracts neutral ramp from gray tokens", async () => {
    const registry = await resolveRegistry(REGISTRY_PATH);
    const fp = fingerprintFromRegistry(registry);

    expect(fp.palette.neutrals.count).toBeGreaterThan(0);
    expect(fp.palette.neutrals.steps.length).toBe(fp.palette.neutrals.count);
  });

  it("classifies saturation and contrast", async () => {
    const registry = await resolveRegistry(REGISTRY_PATH);
    const fp = fingerprintFromRegistry(registry);

    expect(["muted", "vibrant", "mixed"]).toContain(fp.palette.saturationProfile);
    expect(["high", "moderate", "low"]).toContain(fp.palette.contrast);
  });

  it("extracts border radii", async () => {
    const registry = await resolveRegistry(REGISTRY_PATH);
    const fp = fingerprintFromRegistry(registry);

    expect(fp.surfaces.borderRadii.length).toBeGreaterThan(0);
  });

  it("detects shadow complexity", async () => {
    const registry = await resolveRegistry(REGISTRY_PATH);
    const fp = fingerprintFromRegistry(registry);

    expect(["none", "subtle", "layered"]).toContain(fp.surfaces.shadowComplexity);
  });

  it("counts UI components", async () => {
    const registry = await resolveRegistry(REGISTRY_PATH);
    const fp = fingerprintFromRegistry(registry);

    expect(fp.architecture.componentCount).toBe(2); // button + card
  });

  it("detects kebab-case naming", async () => {
    const registry = await resolveRegistry(REGISTRY_PATH);
    const fp = fingerprintFromRegistry(registry);

    expect(fp.architecture.namingPattern).toBe("kebab-case");
  });

  it("includes a 64-element embedding", async () => {
    const registry = await resolveRegistry(REGISTRY_PATH);
    const fp = fingerprintFromRegistry(registry);

    expect(fp.embedding).toHaveLength(64);
  });

  it("sets architecture tokenization to 1 for registry", async () => {
    const registry = await resolveRegistry(REGISTRY_PATH);
    const fp = fingerprintFromRegistry(registry);

    expect(fp.architecture.tokenization).toBe(1);
    expect(fp.architecture.methodology).toContain("css-custom-properties");
  });
});
