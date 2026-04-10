import { describe, expect, it } from "vitest";
import { profileRegistry } from "../src/profile.js";
import { REGISTRY_PATH } from "./helpers/fixtures.js";

describe("profileRegistry", () => {
  it("produces a fingerprint from a registry path", async () => {
    const fp = await profileRegistry(REGISTRY_PATH);

    expect(fp).toBeDefined();
    expect(fp.id).toBe("test-ds");
    expect(fp.palette).toBeDefined();
    expect(fp.spacing).toBeDefined();
    expect(fp.typography).toBeDefined();
    expect(fp.surfaces).toBeDefined();
    expect(fp.architecture).toBeDefined();
  });

  it("uses deterministic embedding when no embeddingConfig provided", async () => {
    const fp = await profileRegistry(REGISTRY_PATH);

    expect(fp.embedding).toBeDefined();
    expect(fp.embedding).toHaveLength(64);

    // Deterministic: running again should produce same embedding
    const fp2 = await profileRegistry(REGISTRY_PATH);
    expect(fp.embedding).toEqual(fp2.embedding);
  });

  it("fingerprint has source 'registry'", async () => {
    const fp = await profileRegistry(REGISTRY_PATH);
    expect(fp.source).toBe("registry");
  });
});
