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

  it("loads a manifest-only package as an empty graph", async () => {
    await writeManifest(dir);

    const loaded = await loadFingerprintPackage(resolveFingerprintPackage(dir));

    expect(loaded.manifest).toEqual({
      schema: "ghost.fingerprint-package/v1",
      id: "local",
    });
    // Only the implicit root, no authored nodes.
    expect([...loaded.catalog.nodes.keys()]).toEqual([]);
  });

  it("folds the directory tree of *.md nodes into the flat catalog", async () => {
    await writeManifest(dir);
    await mkdir(join(dir, "checkout"), { recursive: true });
    await writeFile(
      join(dir, "checkout", "principle.trust.md"),
      "---\ndescription: Trust at the payment moment.\n---\n\nReduce felt risk near payment.\n",
    );

    const loaded = await loadFingerprintPackage(resolveFingerprintPackage(dir));

    // id is the path; kind/slug come from the filename.
    const authored = loaded.catalog.nodes.get("checkout/principle.trust");
    expect(authored?.body).toBe("Reduce felt risk near payment.");
    expect(authored?.description).toBe("Trust at the payment moment.");
    expect(authored?.kind).toBe("principle");
    expect(authored?.slug).toBe("trust");
  });

  it("surfaces a node that fails its own schema instead of dropping it", async () => {
    await writeManifest(dir);
    await mkdir(join(dir, "features"), { recursive: true });
    // `relates` is a removed key — the node fails per-node lint and is skipped
    // while folding, but must not vanish silently.
    await writeFile(
      join(dir, "features", "index.md"),
      "---\ndescription: All feature UI.\nrelates:\n  - to: core\n---\n\nFeature prose.\n",
    );

    const loaded = await loadFingerprintPackage(resolveFingerprintPackage(dir));
    // The malformed node is excluded from the graph but retained as invalid.
    expect(loaded.catalog.nodes.has("features")).toBe(false);
    expect(loaded.invalid).toEqual([
      {
        file: "features/index.md",
        message: expect.stringContaining("relates"),
      },
    ]);

    // `validate` promotes it to a loud error keyed to the offending file.
    const report = await lintFingerprintPackage(dir);
    expect(report.errors).toBe(1);
    expect(report.issues[0]).toMatchObject({
      rule: "node-invalid",
      path: "features/index.md",
    });
  });

  it("does not warn when a node kind is declared in the glossary", async () => {
    await writeManifest(dir);
    await writeGlossary(dir, ["principle"]);
    await writeFile(
      join(dir, "principle.density.md"),
      "---\ndescription: Density stance.\n---\n\nUse density deliberately.\n",
    );

    const report = await lintFingerprintPackage(dir);

    expect(report.errors).toBe(0);
    expect(report.warnings).toBe(0);
    expect(report.issues).not.toContainEqual(
      expect.objectContaining({ rule: "kind-undeclared" }),
    );
  });

  it("does not warn for an uncategorized bare node name", async () => {
    await writeManifest(dir);
    await writeGlossary(dir, ["principle"]);
    await writeFile(
      join(dir, "voice.md"),
      "---\ndescription: Voice.\n---\n\nSpeak plainly.\n",
    );

    const report = await lintFingerprintPackage(dir);

    expect(report.errors).toBe(0);
    expect(report.warnings).toBe(0);
    expect(report.issues).not.toContainEqual(
      expect.objectContaining({ rule: "kind-undeclared" }),
    );
  });

  it("warns when a node kind is not declared in the glossary", async () => {
    await writeManifest(dir);
    await writeGlossary(dir, ["principle"]);
    await writeFile(
      join(dir, "principles.density.md"),
      "---\ndescription: Density stance.\n---\n\nUse density deliberately.\n",
    );

    const report = await lintFingerprintPackage(dir);

    expect(report.errors).toBe(0);
    expect(report.warnings).toBe(1);
    expect(report.issues[0]).toMatchObject({
      severity: "warning",
      rule: "kind-undeclared",
      path: "principles.density.md",
      message: expect.stringContaining("`principles`"),
    });
    expect(report.issues[0]?.message).toContain("Did you mean `principle`?");
  });

  it("does not warn about node kinds when no glossary is present", async () => {
    await writeManifest(dir);
    await writeFile(
      join(dir, "principles.density.md"),
      "---\ndescription: Density stance.\n---\n\nUse density deliberately.\n",
    );

    const report = await lintFingerprintPackage(dir);

    expect(report.errors).toBe(0);
    expect(report.warnings).toBe(0);
    expect(report.issues).not.toContainEqual(
      expect.objectContaining({ rule: "kind-undeclared" }),
    );
  });

  it("loads node materials into the catalog", async () => {
    await writeManifest(dir);
    await writeFile(
      join(dir, "asset.logo.md"),
      "---\ndescription: Logo.\nmaterials:\n  - brand/logo*.svg\n  - https://example.com/logo\n---\n\nLogo prose.\n",
    );

    const loaded = await loadFingerprintPackage(resolveFingerprintPackage(dir));

    expect(loaded.catalog.nodes.get("asset.logo")?.materials).toEqual([
      "brand/logo*.svg",
      "https://example.com/logo",
    ]);
  });

  it("rejects invalid material locators", async () => {
    await writeManifest(dir);
    await writeFile(
      join(dir, "asset.logo.md"),
      "---\ndescription: Logo.\nmaterials:\n  - /absolute/logo.svg\n---\n\nLogo prose.\n",
    );

    const report = await lintFingerprintPackage(dir);

    expect(report.errors).toBe(1);
    expect(report.issues[0]).toMatchObject({
      rule: "node-invalid",
      path: "asset.logo.md",
    });
  });

  it("reserves haunts/ — checks-haunt files are never nodes", async () => {
    await writeManifest(dir);
    await writeFile(
      join(dir, "asset.logo.md"),
      "---\ndescription: Logo.\nmaterials:\n  - brand/logo.svg\n---\n\nLogo prose.\n",
    );
    await writeChecksHaunt(dir, [
      [
        "logo-clearspace.md",
        "---\nname: logo-clearspace\ndescription: Logo clearspace holds.\nseverity: high\nreferences:\n  - asset.logo\n---\n\nGrade it.\n",
      ],
    ]);

    const loaded = await loadFingerprintPackage(resolveFingerprintPackage(dir));

    expect([...loaded.catalog.nodes.keys()]).toEqual(["asset.logo"]);
    expect(loaded.haunts).toEqual(["checks"]);
    expect([...loaded.checks.keys()]).toEqual(["logo-clearspace"]);
    expect(loaded.invalid).toEqual([]);
    expect(loaded.invalidHaunts).toEqual([]);
  });

  it("flags a haunt directory without haunt.yml", async () => {
    await writeManifest(dir);
    await mkdir(join(dir, "haunts", "checks"), { recursive: true });

    const report = await lintFingerprintPackage(dir);

    expect(report.errors).toBe(1);
    expect(report.issues[0]).toMatchObject({
      rule: "haunt-invalid",
      path: "haunts/checks",
    });
  });

  it("flags an unknown haunt id", async () => {
    await writeManifest(dir);
    await mkdir(join(dir, "haunts", "spectre"), { recursive: true });
    await writeFile(
      join(dir, "haunts", "spectre", "haunt.yml"),
      "schema: ghost.haunt/v1\nid: spectre\n",
    );

    const report = await lintFingerprintPackage(dir);

    expect(report.errors).toBe(1);
    expect(report.issues[0]).toMatchObject({
      rule: "haunt-invalid",
      path: "haunts/spectre",
    });
  });

  it("gives index.md the uniform id `index` — no core mapping", async () => {
    await writeManifest(dir);
    await writeFile(
      join(dir, "index.md"),
      "---\ndescription: Start here.\n---\n\nFront door prose.\n",
    );
    await mkdir(join(dir, "email"), { recursive: true });
    await writeFile(
      join(dir, "email", "index.md"),
      "---\ndescription: Email surface.\n---\n\nEmail.\n",
    );

    const loaded = await loadFingerprintPackage(resolveFingerprintPackage(dir));

    // The id rule is uniform: path minus .md.
    expect([...loaded.catalog.nodes.keys()]).toEqual(["email/index", "index"]);
    expect(loaded.catalog.nodes.get("index")?.slug).toBe("index");
    expect(loaded.catalog.nodes.get("index")?.kind).toBeUndefined();
  });

  it("rejects retired plugin declarations", async () => {
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, "manifest.yml"),
      "schema: ghost.fingerprint-package/v1\nid: local\nplugins:\n  - retired\n",
    );

    const report = await lintFingerprintPackage(dir);

    expect(report.errors).toBe(1);
    expect(report.issues[0]).toMatchObject({
      rule: "schema/unrecognized_keys",
      path: "manifest.yml",
    });
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

async function writeChecksHaunt(
  dir: string,
  checks: Array<[string, string]>,
): Promise<void> {
  const hauntDir = join(dir, "haunts", "checks");
  await mkdir(hauntDir, { recursive: true });
  await writeFile(
    join(hauntDir, "haunt.yml"),
    "schema: ghost.haunt/v1\nid: checks\n",
  );
  for (const [name, content] of checks) {
    await writeFile(join(hauntDir, name), content);
  }
}

async function writeGlossary(dir: string, categories: string[]): Promise<void> {
  await writeFile(
    join(dir, "glossary.md"),
    `---\ncategories:\n${categories.map((name) => `  - name: ${name}`).join("\n")}\n---\n\n${categories.map((name) => `# ${name}\n\n${name} purpose.`).join("\n\n")}\n`,
  );
}
