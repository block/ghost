import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { writeDirectoryTarball } from "../src/scan/tarball.js";

describe("tarball writer", () => {
  let dir: string;

  beforeEach(async () => {
    dir = join(
      tmpdir(),
      `ghost-tarball-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await mkdir(dir, { recursive: true });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("round-trips sorted regular files with export.yml metadata", async () => {
    const root = join(dir, "pkg");
    await mkdir(join(root, "nested"), { recursive: true });
    await writeFile(join(root, "b.txt"), "bee\n");
    await writeFile(join(root, "nested", "a.txt"), "aye\n");
    const archivePath = join(dir, "archive.tgz");

    await writeDirectoryTarball({
      rootDir: root,
      outFile: archivePath,
      extraEntries: [
        {
          path: "export.yml",
          data: "schema: ghost.export/v1\nid: local\ncli: 0.0.0\nexported: 2026-01-02T03:04:05.000Z\n",
          mtime: new Date("2026-01-02T03:04:05.000Z"),
        },
      ],
    });

    const entries = parseTarEntries(gunzipSync(await readFile(archivePath)));
    expect([...entries.keys()]).toEqual([
      "b.txt",
      "export.yml",
      "nested/a.txt",
    ]);
    expect(entries.get("b.txt")?.toString("utf-8")).toBe("bee\n");
    expect(entries.get("nested/a.txt")?.toString("utf-8")).toBe("aye\n");
    expect(entries.get("export.yml")?.toString("utf-8")).toContain(
      "schema: ghost.export/v1",
    );
    expect(entries.get("export.yml")?.toString("utf-8")).toContain(
      "exported: 2026-01-02T03:04:05.000Z",
    );
  });

  it("excludes matching paths", async () => {
    const root = join(dir, "pkg");
    await mkdir(join(root, "haunts", "checks"), { recursive: true });
    await writeFile(join(root, ".events"), "private\n");
    await writeFile(
      join(root, "haunts", "checks", "haunt.yml"),
      "id: checks\n",
    );
    await writeFile(join(root, "manifest.yml"), "id: local\n");
    const archivePath = join(dir, "archive.tgz");

    await writeDirectoryTarball({
      rootDir: root,
      outFile: archivePath,
      exclude: (path) => path === ".events" || path.startsWith("haunts/"),
    });

    const entries = parseTarEntries(gunzipSync(await readFile(archivePath)));
    expect([...entries.keys()]).toEqual(["manifest.yml"]);
  });
});

function parseTarEntries(buffer: Buffer): Map<string, Buffer> {
  const entries = new Map<string, Buffer>();
  let offset = 0;
  while (offset + 512 <= buffer.byteLength) {
    const header = buffer.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    const name = readTarString(header, 0, 100);
    const prefix = readTarString(header, 345, 155);
    const sizeText = readTarString(header, 124, 12).replace(/\0/g, "").trim();
    const size = Number.parseInt(sizeText || "0", 8);
    const path = prefix ? `${prefix}/${name}` : name;
    const dataStart = offset + 512;
    entries.set(path, buffer.subarray(dataStart, dataStart + size));
    offset = dataStart + Math.ceil(size / 512) * 512;
  }
  return entries;
}

function readTarString(buffer: Buffer, offset: number, length: number): string {
  const slice = buffer.subarray(offset, offset + length);
  const end = slice.indexOf(0);
  return slice.subarray(0, end === -1 ? slice.length : end).toString("utf-8");
}
