import { mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  gatherGhostPackage,
  inspectGhostMaterial,
  loadGhostSnapshot,
  pullGhostNodes,
  stampGhostEvent,
} from "../src/embed/index.js";
import type { GhostEmbedSnapshot } from "../src/embed/types.js";
import { resolveGhostPackage } from "../src/package.js";

function withDeclaredMaterial(
  snapshot: GhostEmbedSnapshot,
  nodeId: string,
  locator: string,
): GhostEmbedSnapshot {
  const node = snapshot.catalog.nodes.get("asset.tokens");
  if (node === undefined) throw new Error("missing fixture node");
  return {
    ...snapshot,
    catalog: {
      nodes: new Map(snapshot.catalog.nodes).set(nodeId, {
        ...node,
        id: nodeId,
        materials: [locator],
      }),
    },
  };
}

async function writePackage(dir: string): Promise<void> {
  await mkdir(join(dir, ".ghost", "materials"), { recursive: true });
  await mkdir(join(dir, "brand"), { recursive: true });
  await writeFile(
    join(dir, ".ghost", "manifest.yml"),
    "schema: ghost.package/v1\nid: local\ncover: cover\n",
  );
  await writeFile(
    join(dir, ".ghost", "glossary.md"),
    "---\nkinds:\n  - name: asset\n  - name: principle\n---\n\n# asset\n\nConcrete materials.\n\n# principle\n\nRules.\n",
  );
  await writeFile(
    join(dir, ".ghost", "cover.md"),
    "---\ndescription: Cover.\n---\n\nSilence posture.\n",
  );
  await writeFile(join(dir, ".ghost", "materials", "tokens.css"), ":root{}\n");
  await writeFile(join(dir, "brand", "voice.txt"), "Plain.\n");
  await writeFile(join(dir, "brand", "alt-a.txt"), "Alt A.\n");
  await writeFile(join(dir, "brand", "alt-b.txt"), "Alt B.\n");
  await writeFile(join(dir, "brand", "bad.md"), Buffer.from([0xff]));
  await writeFile(join(dir, "brand", "mark.png"), Buffer.from([0, 1, 2]));
  await writeFile(
    join(dir, ".ghost", "asset.tokens.md"),
    [
      "---",
      "description: Tokens.",
      "materials:",
      "  - materials/tokens.css",
      "  - brand/voice.txt",
      "  - brand/alt-*.txt",
      "  - brand/bad.md",
      "  - brand/growing.txt",
      "  - https://example.com/brand-kit",
      "---",
      "",
      "Token prose.",
      "",
      "## Skeleton",
      "",
      "```css",
      ":root { }",
      "```",
      "",
      "Strip me.",
    ].join("\n"),
  );
  await writeFile(
    join(dir, ".ghost", "principle.rule.md"),
    "---\ndescription: Rule.\n---\n\nRule prose.\n",
  );
  await mkdir(join(dir, ".ghost", "checks"), { recursive: true });
  await writeFile(
    join(dir, ".ghost", "checks", "tokens.md"),
    "---\nname: Tokens\ndescription: Check tokens.\nseverity: medium\nreferences:\n  - asset.tokens\n---\n\nCheck body.\n",
  );
}

describe("embed contract", () => {
  let dir: string;

  beforeEach(async () => {
    dir = join(
      tmpdir(),
      `ghost-embed-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await mkdir(dir, { recursive: true });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("loads snapshot cover states without mutating events", async () => {
    await writePackage(dir);
    const paths = resolveGhostPackage(undefined, dir);

    const resolved = await loadGhostSnapshot(paths);
    expect(resolved.cover).toMatchObject({ state: "resolved", id: "cover" });
    expect(resolved.checks.size).toBe(1);
    await expect(
      readFile(join(dir, ".ghost", ".events"), "utf-8"),
    ).rejects.toThrow();
    expect(Object.isFrozen(resolved)).toBe(true);

    await writeFile(
      join(dir, ".ghost", "manifest.yml"),
      "schema: ghost.package/v1\nid: local\ncover: missing\n",
    );
    const dangling = await loadGhostSnapshot(paths);
    expect(dangling.cover).toEqual({ state: "dangling", id: "missing" });

    await writeFile(
      join(dir, ".ghost", "manifest.yml"),
      "schema: ghost.package/v1\nid: local\n",
    );
    const absent = await loadGhostSnapshot(paths);
    expect(absent.cover).toEqual({ state: "absent" });
  });

  it("gathers cover, complete menu, coverage, kinds, and separates checks", async () => {
    await writePackage(dir);
    const snapshot = await loadGhostSnapshot(
      resolveGhostPackage(undefined, dir),
    );

    const result = gatherGhostPackage(snapshot, { ask: "tokens" });

    expect(result.ask).toBe("tokens");
    expect(result.cover.state).toBe("resolved");
    expect(result.nodes.map((node) => node.id)).toEqual([
      "asset.tokens",
      "principle.rule",
    ]);
    expect(result.coverage).toEqual({
      nodes: 2,
      concrete: 1,
      payloads: { materials: 1, fencedExamples: 0, skeletons: 1 },
      undescribed: 0,
    });
    expect(result.kinds).toContainEqual({
      name: "asset",
      purpose: "Concrete materials.",
    });
    expect(JSON.stringify(result)).not.toContain("Check tokens");
    expect(snapshot.checks.size).toBe(1);
  });

  it("pulls with validation, order, skeletons, materials, and no checks", async () => {
    await writePackage(dir);
    const snapshot = await loadGhostSnapshot(
      resolveGhostPackage(undefined, dir),
    );

    const result = await pullGhostNodes(snapshot, {
      ids: ["principle.rule", "asset.tokens", "asset.tokens", "principle.rul"],
      repoRoot: dir,
    });

    expect(result.requested).toEqual([
      "principle.rule",
      "asset.tokens",
      "principle.rul",
    ]);
    expect(result.ids).toEqual(["principle.rule", "asset.tokens"]);
    expect(result.missed).toEqual([
      { requested: "principle.rul", suggested: ["principle.rule"] },
    ]);
    expect(result.nodes.map((node) => node.id)).toEqual([
      "asset.tokens",
      "principle.rule",
    ]);
    expect(result.nodes[0].body).toContain("Token prose.");
    expect(result.nodes[0].body).not.toContain("Strip me.");
    expect(result.skeletons).toEqual([
      { nodeId: "asset.tokens", info: "css", content: ":root { }" },
    ]);
    expect(result.materialCounts).toEqual({ inlined: 4, omitted: 3 });
    expect(
      result.nodes[0].materials?.map((material) => material.locator),
    ).toEqual([
      "materials/tokens.css",
      "brand/voice.txt",
      "brand/alt-a.txt",
      "brand/alt-b.txt",
      "brand/bad.md",
      "brand/growing.txt",
      "https://example.com/brand-kit",
    ]);
    expect(JSON.stringify(result)).not.toContain("Check tokens");
  });

  it("keeps unknown-extension text materials inline", async () => {
    await writePackage(dir);
    await writeFile(join(dir, "brand", "tokens.yml"), "color: green\n");
    const baseSnapshot = await loadGhostSnapshot(
      resolveGhostPackage(undefined, dir),
    );
    const snapshot = withDeclaredMaterial(
      baseSnapshot,
      "asset.yaml",
      "brand/tokens.yml",
    );

    const result = await pullGhostNodes(snapshot, {
      ids: ["asset.yaml"],
      repoRoot: dir,
    });

    expect(result.nodes[0]?.materials).toContainEqual(
      expect.objectContaining({
        locator: "brand/tokens.yml",
        inlined: "color: green\n",
      }),
    );
  });

  it("inspects only declared contained locators under explicit host policy", async () => {
    await writePackage(dir);
    const snapshot = await loadGhostSnapshot(
      resolveGhostPackage(undefined, dir),
    );

    const bundled = await inspectGhostMaterial(snapshot, {
      nodeId: "asset.tokens",
      locator: "materials/tokens.css",
      repoRoot: dir,
    });
    expect(bundled).toMatchObject({
      ok: true,
      contentKind: "text",
      text: ":root{}\n",
    });

    const referencedDefault = await inspectGhostMaterial(snapshot, {
      nodeId: "asset.tokens",
      locator: "brand/voice.txt",
      repoRoot: dir,
    });
    expect(referencedDefault).toMatchObject({
      ok: false,
      reason: "referenced material inspection is disabled by policy",
    });

    const referencedAllowed = await inspectGhostMaterial(snapshot, {
      nodeId: "asset.tokens",
      locator: "brand/voice.txt",
      repoRoot: dir,
      policy: { local: "bundled-and-referenced" },
    });
    expect(referencedAllowed).toMatchObject({
      ok: true,
      contentKind: "text",
      text: "Plain.\n",
    });

    const https = await inspectGhostMaterial(snapshot, {
      nodeId: "asset.tokens",
      locator: "https://example.com/brand-kit",
      repoRoot: dir,
    });
    expect(https).toMatchObject({
      ok: false,
      tier: "url",
      reason: "network material inspection is disabled by policy",
    });

    const multiple = await inspectGhostMaterial(snapshot, {
      nodeId: "asset.tokens",
      locator: "brand/alt-*.txt",
      repoRoot: dir,
      policy: { local: "bundled-and-referenced" },
    });
    expect(multiple).toMatchObject({
      ok: false,
      tier: "referenced",
      reason:
        "locator matched multiple local files; inspect one matching file path at a time",
    });

    const globMatch = await inspectGhostMaterial(snapshot, {
      nodeId: "asset.tokens",
      locator: "brand/alt-a.txt",
      repoRoot: dir,
      policy: { local: "bundled-and-referenced" },
    });
    expect(globMatch).toMatchObject({
      ok: true,
      tier: "referenced",
      path: "brand/alt-a.txt",
      text: "Alt A.\n",
    });

    const mimeRejected = await inspectGhostMaterial(snapshot, {
      nodeId: "asset.tokens",
      locator: "materials/tokens.css",
      repoRoot: dir,
      policy: { allowedMimeTypes: ["image/*"] },
    });
    expect(mimeRejected).toMatchObject({
      ok: false,
      tier: "bundled",
      mime: "text/css",
      reason: "MIME type text/css is not allowed by policy",
    });

    const statSizeRejected = await inspectGhostMaterial(snapshot, {
      nodeId: "asset.tokens",
      locator: "brand/voice.txt",
      repoRoot: dir,
      policy: { local: "bundled-and-referenced", maxBytes: 3 },
    });
    expect(statSizeRejected).toMatchObject({
      ok: false,
      tier: "referenced",
      byteLength: "Plain.\n".length,
      reason: "exceeds 3 byte inspect limit",
    });

    const invalidUtf8 = await inspectGhostMaterial(snapshot, {
      nodeId: "asset.tokens",
      locator: "brand/bad.md",
      repoRoot: dir,
      policy: { local: "bundled-and-referenced" },
    });
    expect(invalidUtf8).toMatchObject({
      ok: false,
      tier: "referenced",
      mime: "text/markdown",
      reason: "not valid UTF-8 text",
    });

    const undeclared = await inspectGhostMaterial(snapshot, {
      nodeId: "asset.tokens",
      locator: "brand/mark.png",
      repoRoot: dir,
      policy: { local: "bundled-and-referenced" },
    });
    expect(undeclared).toMatchObject({
      ok: false,
      reason: "locator is not declared by node",
    });
  });

  it("rejects declared traversal and absolute material locators", async () => {
    await writePackage(dir);
    await writeFile(
      join(dir, ".ghost", "asset.traversal.md"),
      "---\ndescription: Traversal.\nmaterials:\n  - ../outside.txt\n---\n\nTraversal prose.\n",
    );
    await writeFile(
      join(dir, ".ghost", "asset.absolute.md"),
      `---\ndescription: Absolute.\nmaterials:\n  - ${join(dir, "brand", "voice.txt")}\n---\n\nAbsolute prose.\n`,
    );
    const baseSnapshot = await loadGhostSnapshot(
      resolveGhostPackage(undefined, dir),
    );
    const snapshot = withDeclaredMaterial(
      withDeclaredMaterial(baseSnapshot, "asset.traversal", "../outside.txt"),
      "asset.absolute",
      join(dir, "brand", "voice.txt"),
    );

    const traversal = await inspectGhostMaterial(snapshot, {
      nodeId: "asset.traversal",
      locator: "../outside.txt",
      repoRoot: dir,
      policy: { local: "bundled-and-referenced" },
    });
    expect(traversal).toMatchObject({
      ok: false,
      reason: "local material locators must not escape the repo with '..'",
    });

    const absoluteLocator = join(dir, "brand", "voice.txt");
    const absolute = await inspectGhostMaterial(snapshot, {
      nodeId: "asset.absolute",
      locator: absoluteLocator,
      repoRoot: dir,
      policy: { local: "bundled-and-referenced" },
    });
    expect(absolute).toMatchObject({
      ok: false,
      reason:
        "local material locators must be repo-relative, not absolute paths",
    });
  });

  it("allows a material under a symlinked lexical repo root", async () => {
    await writePackage(dir);
    const symlinkRoot = `${dir}-link`;
    await symlink(dir, symlinkRoot, "dir");
    try {
      const snapshot = await loadGhostSnapshot(
        resolveGhostPackage(undefined, symlinkRoot),
      );

      const material = await inspectGhostMaterial(snapshot, {
        nodeId: "asset.tokens",
        locator: "materials/tokens.css",
        repoRoot: symlinkRoot,
      });
      expect(material).toMatchObject({
        ok: true,
        path: ".ghost/materials/tokens.css",
        text: ":root{}\n",
      });
    } finally {
      await rm(symlinkRoot, { recursive: true, force: true });
    }
  });

  it("rejects a symlinked file inside the repo when the target escapes", async () => {
    await writePackage(dir);
    const outsideDir = `${dir}-outside`;
    await mkdir(outsideDir, { recursive: true });
    await writeFile(join(outsideDir, "secret.txt"), "outside\n");
    await symlink(
      join(outsideDir, "secret.txt"),
      join(dir, "brand", "escape.txt"),
    );
    await writeFile(
      join(dir, ".ghost", "asset.escape.md"),
      "---\ndescription: Escape.\nmaterials:\n  - brand/escape.txt\n---\n\nEscape prose.\n",
    );
    try {
      const snapshot = await loadGhostSnapshot(
        resolveGhostPackage(undefined, dir),
      );

      const escaped = await inspectGhostMaterial(snapshot, {
        nodeId: "asset.escape",
        locator: "brand/escape.txt",
        repoRoot: dir,
        policy: { local: "bundled-and-referenced" },
      });
      expect(escaped).toMatchObject({
        ok: false,
        tier: "referenced",
        reason: "resolved material path escapes repo",
      });

      const pulled = await pullGhostNodes(snapshot, {
        ids: ["asset.escape"],
        repoRoot: dir,
      });
      expect(pulled.nodes[0]?.materials).toContainEqual(
        expect.objectContaining({
          locator: "brand/escape.txt",
          omitted: true,
          reason: "resolved material path escapes repo",
        }),
      );
    } finally {
      await rm(outsideDir, { recursive: true, force: true });
    }
  });

  it("stamps events purely", () => {
    const event = stampGhostEvent(
      { event: "gather", ask: "checkout", menu: ["voice"] },
      new Date("2026-01-02T03:04:05.000Z"),
    );
    expect(event).toEqual({
      ts: "2026-01-02T03:04:05.000Z",
      event: "gather",
      ask: "checkout",
      menu: ["voice"],
    });
  });
});
