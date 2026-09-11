import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  inspectGhostMaterial,
  loadGhostSnapshot,
  pullGhostNodes,
} from "../src/embed/index.js";
import { resolveGhostPackage } from "../src/package.js";

const INLINE_BYTES = 8 * 1024;
const INSPECT_BYTES = 2 * 1024 * 1024;

// Include distinct beginning, middle, and ending content; compare every byte.
function textBytes(bytes: number): string {
  const middle = "日🧭é".repeat(20);
  const overhead = Buffer.byteLength(`start\n${middle}\nend`);
  return `start\n${middle}${"x".repeat(bytes - overhead)}\nend`;
}

describe("whole material content and explicit delivery outcomes", () => {
  let dir: string;
  let packageDir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "ghost-material-delivery-"));
    packageDir = join(dir, ".ghost");
    await mkdir(join(packageDir, "materials"), { recursive: true });
    await writeFile(
      join(packageDir, "manifest.yml"),
      "schema: ghost.package/v1\nid: delivery-test\n",
    );
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  async function node(id: string, materials: string[]): Promise<void> {
    await writeFile(
      join(packageDir, `${id}.md`),
      `---\nfor: Reading references.\nmaterials:\n${materials.map((locator) => `  - ${locator}`).join("\n")}\n---\n\nRead each required reference.\n`,
    );
  }

  function snapshot() {
    return loadGhostSnapshot(resolveGhostPackage(packageDir, dir));
  }

  it.each([
    INLINE_BYTES - 1,
    INLINE_BYTES,
    INLINE_BYTES + 1,
  ])("delivers complete referenced text or an explicit pointer at %i UTF-8 bytes", async (bytes) => {
    const text = textBytes(bytes);
    expect(Buffer.byteLength(text)).toBe(bytes);
    expect(text.length).toBeLessThan(bytes);
    await writeFile(join(dir, "reference.txt"), text);
    await node("reference", ["reference.txt"]);
    const packet = await pullGhostNodes(await snapshot(), {
      ids: ["reference"],
      repoRoot: dir,
    });
    const materials = packet.nodes[0].materials;
    expect(materials).toHaveLength(1);
    const delivered = materials?.[0];
    if (bytes <= INLINE_BYTES) {
      expect(delivered).toMatchObject({
        locator: "reference.txt",
        tier: "referenced",
        inlined: text,
        untrusted: true,
      });
      expect(delivered).not.toHaveProperty("omitted");
    } else {
      expect(delivered).toMatchObject({
        locator: "reference.txt",
        tier: "referenced",
        omitted: true,
        reason: "exceeds 8 KB inline limit",
      });
      expect(delivered).not.toHaveProperty("inlined");
    }
  });

  it("delivers large bundled text in full rather than applying the referenced threshold", async () => {
    const text = textBytes(INSPECT_BYTES + 1);
    await writeFile(join(packageDir, "materials", "large.txt"), text);
    await node("reference", ["materials/large.txt"]);
    const packet = await pullGhostNodes(await snapshot(), {
      ids: ["reference"],
      repoRoot: dir,
    });
    expect(packet.nodes[0].materials).toHaveLength(1);
    expect(packet.nodes[0].materials?.[0]).toMatchObject({
      tier: "bundled",
      inlined: text,
      untrusted: true,
    });
    expect(packet.materialCounts).toEqual({ inlined: 1, omitted: 0 });
  });

  it("accounts for every declaration without disguising unavailable material as delivered content", async () => {
    const locators = [
      "materials/good.txt",
      "materials/binary.png",
      "materials/invalid.txt",
      "materials/missing.txt",
      "https://example.com/brand",
    ];
    const text = "Complete reference 日本語 🧭.\n";
    await writeFile(join(packageDir, "materials", "good.txt"), text);
    await writeFile(
      join(packageDir, "materials", "binary.png"),
      Buffer.from([0, 1, 2]),
    );
    await writeFile(
      join(packageDir, "materials", "invalid.txt"),
      Buffer.from([0xff]),
    );
    await node("reference", locators);
    const packet = await pullGhostNodes(await snapshot(), {
      ids: ["reference"],
      repoRoot: dir,
    });
    const materials = packet.nodes[0].materials ?? [];
    expect(materials.map((material) => material.locator)).toEqual(locators);
    expect(materials[0]).toMatchObject({ inlined: text, untrusted: true });
    expect(materials.slice(1).map((material) => material.reason)).toEqual([
      "binary inspect-pointer",
      "not valid UTF-8 text",
      "matched no local files",
      "external locator; use an available host connection if the task requires it",
    ]);
    for (const material of materials.slice(1)) {
      expect(material.omitted).toBe(true);
      expect(material).not.toHaveProperty("inlined");
    }
    expect(packet.materialCounts).toEqual({ inlined: 1, omitted: 4 });
  });

  it("resolves all shared-material pointers to the complete content carried by the cover", async () => {
    const text = textBytes(16384);
    await writeFile(join(packageDir, "materials", "shared.txt"), text);
    await writeFile(
      join(packageDir, "manifest.yml"),
      "schema: ghost.package/v1\nid: delivery-test\ncover: cover\n",
    );
    await node("cover", ["materials/shared.txt"]);
    await node("first", ["materials/shared.txt"]);
    await node("second", ["materials/shared.txt"]);
    const packet = await pullGhostNodes(await snapshot(), {
      ids: ["second", "first"],
      repoRoot: dir,
    });
    expect(packet.cover.state).toBe("resolved");
    if (packet.cover.state !== "resolved")
      throw new Error("fixture cover missing");
    const carrier = packet.cover.node.materials?.[0];
    expect(carrier).toMatchObject({ inlined: text, untrusted: true });
    expect(packet.nodes.map((entry) => entry.id)).toEqual(["second", "first"]);
    for (const entry of packet.nodes) {
      expect(entry.materials).toHaveLength(1);
      expect(entry.materials?.[0]).toMatchObject({
        locator: carrier?.locator,
        path: carrier?.path,
        omitted: true,
        reason: `content inlined above under node ${packet.cover.id}`,
      });
      expect(entry.materials?.[0]).not.toHaveProperty("inlined");
    }
    expect(packet.materialCounts).toEqual({ inlined: 1, omitted: 2 });
  });

  it.each([
    INSPECT_BYTES,
    INSPECT_BYTES + 1,
  ])("inspection returns complete text or a rejection at %i bytes, never a prefix", async (bytes) => {
    const text = textBytes(bytes);
    await writeFile(join(packageDir, "materials", "inspect.txt"), text);
    await node("reference", ["materials/inspect.txt"]);
    const result = await inspectGhostMaterial(await snapshot(), {
      nodeId: "reference",
      locator: "materials/inspect.txt",
      repoRoot: dir,
    });
    if (bytes === INSPECT_BYTES) {
      expect(result).toMatchObject({
        ok: true,
        byteLength: bytes,
        contentKind: "text",
        encoding: "utf-8",
        text,
        untrusted: true,
      });
    } else {
      expect(result).toMatchObject({
        ok: false,
        byteLength: bytes,
        reason: `exceeds ${INSPECT_BYTES} byte inspect limit`,
      });
      expect(result).not.toHaveProperty("text");
    }
  });
});
