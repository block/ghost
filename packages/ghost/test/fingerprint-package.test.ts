import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parseGlossary } from "../src/ghost-core/index.js";
import {
  lintGhostPackage,
  loadGhostPackage,
  resolveGhostPackage,
} from "../src/package.js";
import { detectFileKind } from "../src/scan/file-kind.js";
import { loadNodeFiles } from "../src/scan/node-files.js";

describe("ghost package", () => {
  let dir: string;

  beforeEach(async () => {
    dir = join(
      tmpdir(),
      `ghost-package-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await mkdir(dir, { recursive: true });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("loads a manifest-only package as an empty catalog", async () => {
    await writeManifest(dir);

    const loaded = await loadGhostPackage(resolveGhostPackage(dir));

    expect(loaded.manifest).toEqual({
      schema: "ghost.package/v1",
      id: "local",
    });
    // Only the implicit root, no authored nodes.
    expect([...loaded.catalog.nodes.keys()]).toEqual([]);
  });

  it("accepts the deprecated fingerprint package schema", async () => {
    await writeFile(
      join(dir, "manifest.yml"),
      "schema: ghost.fingerprint-package/v1\nid: legacy\n",
    );

    const loaded = await loadGhostPackage(resolveGhostPackage(dir));

    expect(loaded.manifest).toEqual({
      schema: "ghost.fingerprint-package/v1",
      id: "legacy",
    });
  });

  it("loads *.md node files into the flat catalog", async () => {
    await writeManifest(dir);
    await mkdir(join(dir, "checkout"), { recursive: true });
    await writeFile(
      join(dir, "checkout", "principle.trust.md"),
      "---\ndescription: Trust at the payment moment.\n---\n\nReduce felt risk near payment.\n",
    );

    const loaded = await loadGhostPackage(resolveGhostPackage(dir));

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
    // while loading, but must not vanish silently.
    await writeFile(
      join(dir, "features", "index.md"),
      "---\ndescription: All feature UI.\nrelates:\n  - to: core\n---\n\nFeature prose.\n",
    );

    const loaded = await loadGhostPackage(resolveGhostPackage(dir));
    // The malformed node is excluded from the catalog but retained as invalid.
    expect(loaded.catalog.nodes.has("features")).toBe(false);
    expect(loaded.invalid).toEqual([
      {
        file: "features/index.md",
        message: expect.stringContaining("relates"),
      },
    ]);

    // `validate` promotes it to a loud error keyed to the offending file.
    const report = await lintGhostPackage(dir);
    expect(report.errors).toBe(1);
    expect(report.issues[0]).toMatchObject({
      rule: "node-invalid",
      path: "features/index.md",
    });
  });

  it("parses glossary kinds and their prose purposes", () => {
    const parsed = parseGlossary(`---
kinds:
  - name: principle
  - name: anti-goal
---

# principle

Floor.

# anti-goal

Replacement rule.
`);

    expect(parsed.glossary?.kinds).toEqual([
      { name: "principle", purpose: "Floor." },
      { name: "anti-goal", purpose: "Replacement rule." },
    ]);
    expect(parsed.glossary?.frontmatter.kinds).toEqual([
      { name: "principle" },
      { name: "anti-goal" },
    ]);
  });

  it("does not warn when a node kind is declared in the glossary", async () => {
    await writeManifest(dir);
    await writeGlossary(dir, ["principle"]);
    await writeFile(
      join(dir, "principle.density.md"),
      "---\ndescription: Density stance.\n---\n\nUse density deliberately.\n",
    );

    const report = await lintGhostPackage(dir);

    expect(report.errors).toBe(0);
    // The only warning is the undeclared cover, never a kind complaint.
    expect(report.warnings).toBe(1);
    expect(report.issues).not.toContainEqual(
      expect.objectContaining({ rule: "kind-undeclared" }),
    );
  });

  it("does not warn for an bare node name without a kind", async () => {
    await writeManifest(dir);
    await writeGlossary(dir, ["principle"]);
    await writeFile(
      join(dir, "voice.md"),
      "---\ndescription: Voice.\n---\n\nSpeak plainly.\n",
    );

    const report = await lintGhostPackage(dir);

    expect(report.errors).toBe(0);
    // The only warning is the undeclared cover, never a kind complaint.
    expect(report.warnings).toBe(1);
    expect(report.issues).not.toContainEqual(
      expect.objectContaining({ rule: "kind-undeclared" }),
    );
  });

  it("warns when a node has no description", async () => {
    await writeManifest(dir);
    await writeGlossary(dir, ["principle"]);
    await writeFile(
      join(dir, "principle.density.md"),
      "---\n{}\n---\n\nUse density deliberately.\n",
    );

    const report = await lintGhostPackage(dir);

    expect(report.errors).toBe(0);
    // Undeclared cover + missing description.
    expect(report.warnings).toBe(2);
    expect(report.issues).toContainEqual(
      expect.objectContaining({
        severity: "warning",
        rule: "node-description-missing",
        path: "principle.density.md",
      }),
    );
  });

  it("does not warn about descriptions when every node has one", async () => {
    await writeManifest(dir);
    await writeGlossary(dir, ["principle"]);
    await writeFile(
      join(dir, "principle.density.md"),
      "---\ndescription: Density stance.\n---\n\nUse density deliberately.\n",
    );

    const report = await lintGhostPackage(dir);

    expect(report.errors).toBe(0);
    expect(report.issues).not.toContainEqual(
      expect.objectContaining({ rule: "node-description-missing" }),
    );
  });

  it("warns when a node kind is not declared in the glossary", async () => {
    await writeManifest(dir);
    await writeGlossary(dir, ["principle"]);
    await writeFile(
      join(dir, "principles.density.md"),
      "---\ndescription: Density stance.\n---\n\nUse density deliberately.\n",
    );

    const report = await lintGhostPackage(dir);

    expect(report.errors).toBe(0);
    // Undeclared cover + undeclared kind.
    expect(report.warnings).toBe(2);
    const kindIssue = report.issues.find(
      (issue) => issue.rule === "kind-undeclared",
    );
    expect(kindIssue).toMatchObject({
      severity: "warning",
      rule: "kind-undeclared",
      path: "principles.density.md",
      message: expect.stringContaining("`principles`"),
    });
    expect(kindIssue?.message).toContain("Did you mean `principle`?");
  });

  it("does not warn about node kinds when no glossary is present", async () => {
    await writeManifest(dir);
    await writeFile(
      join(dir, "principles.density.md"),
      "---\ndescription: Density stance.\n---\n\nUse density deliberately.\n",
    );

    const report = await lintGhostPackage(dir);

    expect(report.errors).toBe(0);
    // The only warning is the undeclared cover, never a kind complaint.
    expect(report.warnings).toBe(1);
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

    const loaded = await loadGhostPackage(resolveGhostPackage(dir));

    expect(loaded.catalog.nodes.get("asset.logo")?.materials).toEqual([
      "brand/logo*.svg",
      "https://example.com/logo",
    ]);
  });

  it("reserves materials/ — bundled materials are never nodes", async () => {
    await writeManifest(dir);
    await mkdir(join(dir, "materials"), { recursive: true });
    await writeFile(
      join(dir, "materials", "asset.logo.md"),
      "---\ndescription: Bundled material.\n---\n\nNot a node.\n",
    );

    const loadedFiles = await loadNodeFiles(dir);

    expect(loadedFiles.nodes).toEqual([]);
    expect(loadedFiles.invalid).toEqual([]);
  });

  it("detects files under materials/ as material artifacts", () => {
    expect(detectFileKind(join(dir, "materials", "logo.svg"), "<svg />")).toBe(
      "material",
    );
    expect(
      detectFileKind(join(dir, "nested", "materials", "token.css"), ":root{}"),
    ).toBe("material");
  });

  it("warns on dead local material locators and orphaned bundled materials", async () => {
    await writeManifest(dir);
    await mkdir(join(dir, "materials"), { recursive: true });
    await writeFile(join(dir, "materials", "claimed.txt"), "claimed\n");
    await writeFile(join(dir, "materials", "orphan.txt"), "orphan\n");
    await writeFile(
      join(dir, "asset.logo.md"),
      "---\ndescription: Logo.\nmaterials:\n  - materials/claimed.txt\n  - missing/logo.svg\n  - https://example.com/logo.svg\n---\n\nLogo prose.\n",
    );

    const report = await lintGhostPackage(dir, dir);

    expect(report.errors).toBe(0);
    // Undeclared cover + dead locator + orphaned material.
    expect(report.warnings).toBe(3);
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: "warning",
          rule: "material-locator-dead",
          path: "asset.logo.md.materials",
          message: expect.stringContaining("missing/logo.svg"),
        }),
        expect.objectContaining({
          severity: "warning",
          rule: "material-orphaned",
          path: "materials/orphan.txt",
        }),
      ]),
    );
    expect(report.issues).not.toContainEqual(
      expect.objectContaining({ message: expect.stringContaining("https://") }),
    );
  });

  it("rejects invalid material locators", async () => {
    await writeManifest(dir);
    await writeFile(
      join(dir, "asset.logo.md"),
      "---\ndescription: Logo.\nmaterials:\n  - /absolute/logo.svg\n---\n\nLogo prose.\n",
    );

    const report = await lintGhostPackage(dir);

    expect(report.errors).toBe(1);
    expect(report.issues[0]).toMatchObject({
      rule: "node-invalid",
      path: "asset.logo.md",
    });
  });

  it("reserves checks/ — check files are never nodes", async () => {
    await writeManifest(dir);
    await writeFile(
      join(dir, "asset.logo.md"),
      "---\ndescription: Logo.\nmaterials:\n  - brand/logo.svg\n---\n\nLogo prose.\n",
    );
    await writeChecks(dir, [
      [
        "logo-clearspace.md",
        "---\nname: logo-clearspace\ndescription: Logo clearspace holds.\nseverity: high\nreferences:\n  - asset.logo\n---\n\nGrade it.\n",
      ],
    ]);

    const loaded = await loadGhostPackage(resolveGhostPackage(dir));

    expect([...loaded.catalog.nodes.keys()]).toEqual(["asset.logo"]);
    expect(loaded.hasChecksDir).toBe(true);
    expect([...loaded.checks.keys()]).toEqual(["logo-clearspace"]);
    expect(loaded.invalid).toEqual([]);
    expect(loaded.invalidChecks).toEqual([]);
  });

  it("reports an absent checks/ directory without error", async () => {
    await writeManifest(dir);

    const loaded = await loadGhostPackage(resolveGhostPackage(dir));

    expect(loaded.hasChecksDir).toBe(false);
    expect(loaded.checks.size).toBe(0);
    expect(loaded.invalidChecks).toEqual([]);
  });

  it("flags a nested directory inside checks/", async () => {
    await writeManifest(dir);
    await mkdir(join(dir, "checks", "nested"), { recursive: true });

    const report = await lintGhostPackage(dir);

    expect(report.errors).toBe(1);
    expect(report.issues[0]).toMatchObject({
      rule: "check-invalid",
      path: "checks/nested",
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

    const loaded = await loadGhostPackage(resolveGhostPackage(dir));

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

    const report = await lintGhostPackage(dir);

    expect(report.errors).toBe(1);
    expect(report.issues[0]).toMatchObject({
      rule: "schema/unrecognized_keys",
      path: "manifest.yml",
    });
  });

  it("reports a missing manifest", async () => {
    await writeFile(join(dir, "index.md"), "---\n---\n\nRoot prose.\n");

    const report = await lintGhostPackage(dir);

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
    "schema: ghost.package/v1\nid: local\n",
  );
}

async function writeChecks(
  dir: string,
  checks: Array<[string, string]>,
): Promise<void> {
  const checksDir = join(dir, "checks");
  await mkdir(checksDir, { recursive: true });
  for (const [name, content] of checks) {
    await writeFile(join(checksDir, name), content);
  }
}

async function writeGlossary(dir: string, kinds: string[]): Promise<void> {
  await writeFile(
    join(dir, "glossary.md"),
    `---\nkinds:\n${kinds
      .map((kind) => `  - name: ${kind}`)
      .join(
        "\n",
      )}\n---\n\n${kinds.map((kind) => `# ${kind}\n\n${kind} purpose.`).join("\n\n")}\n`,
  );
}
