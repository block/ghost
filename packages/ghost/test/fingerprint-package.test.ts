import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  lintFingerprintPackage,
  loadFingerprintPackage,
  resolveFingerprintPackage,
} from "../src/fingerprint.js";

describe("split fingerprint package", () => {
  let dir: string;

  beforeEach(async () => {
    dir = join(
      tmpdir(),
      `ghost-fingerprint-package-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await mkdir(dir, { recursive: true });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("loads manifest and normalizes missing raw facet files", async () => {
    await writeManifest(dir);

    const loaded = await loadFingerprintPackage(resolveFingerprintPackage(dir));

    expect(loaded.manifest).toEqual({
      schema: "ghost.fingerprint-package/v1",
      id: "local",
    });
    expect(loaded.fingerprint).toMatchObject({
      schema: "ghost.fingerprint/v1",
      intent: {
        summary: {},
        situations: [],
        principles: [],
        experience_contracts: [],
      },
      inventory: {
        building_blocks: {},
        exemplars: [],
        sources: [],
      },
      composition: { patterns: [] },
    });
  });

  it("accepts inventory source links without making source material canonical", async () => {
    await writeManifest(dir);
    await writeFile(
      join(dir, "inventory.yml"),
      `building_blocks: {}
exemplars: []
sources:
  - id: repo-signals
    kind: file
    ref: docs/architecture.md
    note: Human-curated source material.
`,
    );

    const report = await lintFingerprintPackage(dir);
    const loaded = await loadFingerprintPackage(resolveFingerprintPackage(dir));

    expect(report.errors).toBe(0);
    expect(loaded.fingerprint.inventory.sources[0]).toMatchObject({
      id: "repo-signals",
      kind: "file",
      ref: "docs/architecture.md",
    });
  });

  it("reports duplicate inventory source ids", async () => {
    await writeManifest(dir);
    await writeFile(
      join(dir, "inventory.yml"),
      `building_blocks: {}
exemplars: []
sources:
  - id: repo-signals
    kind: file
    ref: docs/architecture.md
  - id: repo-signals
    kind: file
    ref: tmp/inventory.json
`,
    );

    const report = await lintFingerprintPackage(dir);

    expect(report.errors).toBe(1);
    expect(report.issues[0]).toMatchObject({
      rule: "duplicate-id",
      path: "inventory.yml.sources[1].id",
    });
  });

  it("reports invalid raw layer YAML at the split path", async () => {
    await writeManifest(dir);
    await writeFile(join(dir, "intent.yml"), "{nope");

    const report = await lintFingerprintPackage(dir);

    expect(report.errors).toBe(1);
    expect(report.issues[0]).toMatchObject({
      rule: "package-yaml-invalid",
      path: "intent.yml",
    });
  });

  it("does not silently treat unreadable optional layer paths as missing", async () => {
    await writeManifest(dir);
    await mkdir(join(dir, "intent.yml"));

    await expect(lintFingerprintPackage(dir)).rejects.toThrow();
  });

  it("does not discover old .ghost.yml alone as a package", async () => {
    await writeFile(
      join(dir, "fingerprint.yml"),
      "schema: ghost.fingerprint/v1\n",
    );

    const report = await lintFingerprintPackage(dir);

    expect(report.errors).toBe(1);
    expect(report.issues[0]).toMatchObject({
      rule: "package-artifact-missing",
      path: "manifest.yml",
    });
  });
});

async function writeManifest(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, "manifest.yml"),
    "schema: ghost.fingerprint-package/v1\nid: local\n",
  );
}
