import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  lintFingerprintPackage,
  loadFingerprintPackage,
  resolveFingerprintPackage,
} from "../src/fingerprint.js";
import { ancestorChain } from "../src/ghost-core/index.js";

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

  it("loads a manifest-only package as an empty graph", async () => {
    await writeManifest(dir);

    const loaded = await loadFingerprintPackage(resolveFingerprintPackage(dir));

    expect(loaded.manifest).toEqual({
      schema: "ghost.fingerprint-package/v1",
      id: "local",
    });
    // Only the implicit root, no authored nodes.
    expect([...loaded.graph.nodes.keys()]).toEqual([]);
  });

  it("folds the directory tree of *.md nodes into the graph", async () => {
    await writeManifest(dir);
    await mkdir(join(dir, "checkout"), { recursive: true });
    await writeFile(
      join(dir, "checkout", "trust.md"),
      "---\ndescription: Trust at the payment moment.\n---\n\nReduce felt risk near payment.\n",
    );

    const loaded = await loadFingerprintPackage(resolveFingerprintPackage(dir));

    // id is the path; the folder is the containing directory.
    const authored = loaded.graph.nodes.get("checkout/trust");
    expect(authored?.origin).toBe("node-file");
    expect(authored?.folder).toBe("checkout");
    expect(authored?.body).toBe("Reduce felt risk near payment.");
    expect(authored?.description).toBe("Trust at the payment moment.");
    // Containment is derived from the id: it resolves up to the core root.
    expect(ancestorChain(loaded.graph, "checkout/trust")).toEqual([
      "checkout",
      "core",
    ]);
  });

  it("guides legacy facet packages to migrate", async () => {
    await writeManifest(dir);
    await writeFile(join(dir, "intent.yml"), "summary: {}\nprinciples: []\n");

    await expect(
      loadFingerprintPackage(resolveFingerprintPackage(dir)),
    ).rejects.toThrow(/ghost migrate/);
  });

  it("reports a missing manifest", async () => {
    await writeFile(join(dir, "index.md"), "---\n---\n\nRoot prose.\n");

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
