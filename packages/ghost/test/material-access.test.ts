import { mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  inspectGhostMaterial,
  loadGhostSnapshot,
  pullGhostNodes,
} from "../src/embed/index.js";
import { resolveGhostPackage } from "../src/package.js";

async function writeAccessPackage(dir: string): Promise<void> {
  await mkdir(join(dir, ".ghost", "materials"), { recursive: true });
  await mkdir(join(dir, "brand"), { recursive: true });
  await writeFile(
    join(dir, ".ghost", "manifest.yml"),
    "schema: ghost.package/v1\nid: local\ncover: cover\n",
  );
  await writeFile(
    join(dir, ".ghost", "glossary.md"),
    "---\nkinds:\n  - name: asset\n---\n\n# asset\n\nConcrete materials.\n",
  );
  await writeFile(
    join(dir, ".ghost", "cover.md"),
    "---\nfor: Cover.\n---\n\nCover.\n",
  );
  await writeFile(join(dir, "brand", "outside-small.txt"), "Outside small.\n");
  await writeFile(join(dir, "brand", "direct-small.txt"), "Direct small.\n");
  await writeFile(
    join(dir, "brand", "outside-big.txt"),
    "x".repeat(8 * 1024 + 1),
  );
  await writeFile(join(dir, ".ghost", "materials", "inside.txt"), "Inside.\n");
  await symlink(
    join(dir, "brand", "outside-small.txt"),
    join(dir, ".ghost", "materials", "outside-small-link.txt"),
  );
  await symlink(
    join(dir, "brand", "outside-big.txt"),
    join(dir, ".ghost", "materials", "outside-big-link.txt"),
  );
  await symlink(
    join(dir, ".ghost", "materials", "inside.txt"),
    join(dir, ".ghost", "materials", "inside-link.txt"),
  );
  await writeFile(
    join(dir, ".ghost", "asset.links.md"),
    [
      "---",
      "for: Links.",
      "materials:",
      "  - materials/outside-small-link.txt",
      "  - materials/outside-big-link.txt",
      "  - materials/inside-link.txt",
      "  - brand/direct-small.txt",
      "---",
      "",
      "Link prose.",
    ].join("\n"),
  );
}

async function writeSymlinkedRootsPackage(dir: string): Promise<string> {
  await mkdir(join(dir, ".ghost"), { recursive: true });
  await mkdir(join(dir, "material-root"), { recursive: true });
  await writeFile(
    join(dir, "material-root", "root-token.txt"),
    "Root token.\n",
  );
  await symlink(join(dir, "material-root"), join(dir, ".ghost", "materials"));
  await writeFile(
    join(dir, ".ghost", "manifest.yml"),
    "schema: ghost.package/v1\nid: local\ncover: cover\n",
  );
  await writeFile(
    join(dir, ".ghost", "glossary.md"),
    "---\nkinds:\n  - name: asset\n---\n\n# asset\n\nConcrete materials.\n",
  );
  await writeFile(
    join(dir, ".ghost", "cover.md"),
    "---\nfor: Cover.\n---\n\nCover.\n",
  );
  await writeFile(
    join(dir, ".ghost", "asset.root.md"),
    "---\nfor: Root.\nmaterials:\n  - materials/root-token.txt\n---\n\nRoot prose.\n",
  );

  const repoLink = `${dir}-link`;
  await symlink(dir, repoLink);
  return repoLink;
}

describe("material access realpath policy", () => {
  let dir: string;

  beforeEach(async () => {
    dir = join(
      tmpdir(),
      `ghost-material-access-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await mkdir(dir, { recursive: true });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
    await rm(`${dir}-link`, { recursive: true, force: true });
  });

  it("downgrades bundled symlinks to in-repo outside-material files for inspection policy", async () => {
    await writeAccessPackage(dir);
    const snapshot = await loadGhostSnapshot(
      resolveGhostPackage(undefined, dir),
    );

    const defaultPolicy = await inspectGhostMaterial(snapshot, {
      nodeId: "asset.links",
      locator: "materials/outside-small-link.txt",
      repoRoot: dir,
    });
    expect(defaultPolicy).toMatchObject({
      ok: false,
      tier: "referenced",
      path: "brand/outside-small.txt",
      reason: "referenced material inspection is disabled by policy",
    });

    const explicitPolicy = await inspectGhostMaterial(snapshot, {
      nodeId: "asset.links",
      locator: "materials/outside-small-link.txt",
      repoRoot: dir,
      policy: { local: "bundled-and-referenced" },
    });
    expect(explicitPolicy).toMatchObject({
      ok: true,
      tier: "referenced",
      path: "brand/outside-small.txt",
      text: "Outside small.\n",
      untrusted: true,
    });
  });

  it("applies the referenced inline limit after bundled symlink downgrade during pull", async () => {
    await writeAccessPackage(dir);
    const snapshot = await loadGhostSnapshot(
      resolveGhostPackage(undefined, dir),
    );

    const result = await pullGhostNodes(snapshot, {
      ids: ["asset.links"],
      repoRoot: dir,
    });

    expect(result.nodes[0]?.materials).toContainEqual({
      locator: "materials/outside-big-link.txt",
      tier: "referenced",
      path: "brand/outside-big.txt",
      omitted: true,
      reason: "exceeds 8 KB inline limit",
    });
    expect(result.nodes[0]?.materials).toContainEqual({
      locator: "brand/direct-small.txt",
      tier: "referenced",
      path: "brand/direct-small.txt",
      inlined: "Direct small.\n",
      untrusted: true,
    });
  });

  it("keeps internal material symlinks bundled under default inspection policy", async () => {
    await writeAccessPackage(dir);
    const snapshot = await loadGhostSnapshot(
      resolveGhostPackage(undefined, dir),
    );

    const result = await inspectGhostMaterial(snapshot, {
      nodeId: "asset.links",
      locator: "materials/inside-link.txt",
      repoRoot: dir,
    });

    expect(result).toMatchObject({
      ok: true,
      tier: "bundled",
      path: ".ghost/materials/inside.txt",
      text: "Inside.\n",
      untrusted: true,
    });
  });

  it("allows symlinked repo and material roots when real targets stay contained", async () => {
    const repoLink = await writeSymlinkedRootsPackage(dir);
    const snapshot = await loadGhostSnapshot(
      resolveGhostPackage(undefined, repoLink),
    );

    const result = await inspectGhostMaterial(snapshot, {
      nodeId: "asset.root",
      locator: "materials/root-token.txt",
      repoRoot: repoLink,
    });

    expect(result).toMatchObject({
      ok: true,
      tier: "bundled",
      path: "material-root/root-token.txt",
      text: "Root token.\n",
      untrusted: true,
    });
  });

  it("denies bundled symlinks that resolve outside the repo", async () => {
    await writeAccessPackage(dir);
    const outsideDir = `${dir}-outside`;
    await mkdir(outsideDir, { recursive: true });
    await writeFile(join(outsideDir, "secret.txt"), "Secret.\n");
    await symlink(
      join(outsideDir, "secret.txt"),
      join(dir, ".ghost", "materials", "outside-repo-link.txt"),
    );
    await writeFile(
      join(dir, ".ghost", "asset.outside.md"),
      "---\nfor: Outside.\nmaterials:\n  - materials/outside-repo-link.txt\n---\n\nOutside prose.\n",
    );
    const snapshot = await loadGhostSnapshot(
      resolveGhostPackage(undefined, dir),
    );

    const result = await inspectGhostMaterial(snapshot, {
      nodeId: "asset.outside",
      locator: "materials/outside-repo-link.txt",
      repoRoot: dir,
      policy: { local: "bundled-and-referenced" },
    });

    expect(result).toMatchObject({
      ok: false,
      tier: "bundled",
      path: ".ghost/materials/outside-repo-link.txt",
      reason: "resolved material path escapes repo",
    });

    await rm(outsideDir, { recursive: true, force: true });
  });
});
