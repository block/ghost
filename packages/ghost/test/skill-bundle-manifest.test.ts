import { readdir, readFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

interface InstallManifest {
  source?: {
    package?: string;
  };
  files?: string[];
}

describe("install manifest", () => {
  it("lists exactly the files in the ghost skill bundle", async () => {
    const manifestPath = resolve(REPO_ROOT, "install", "manifest.json");
    const manifest = JSON.parse(
      await readFile(manifestPath, "utf-8"),
    ) as InstallManifest;
    const packagePath =
      manifest.source?.package ?? "packages/ghost/src/skill-bundle";
    const bundleRoot = resolve(REPO_ROOT, packagePath);
    const actual = await listFiles(bundleRoot);
    const listed = [...(manifest.files ?? [])].sort();

    expect(listed).toEqual(actual);
  });
});

async function listFiles(root: string): Promise<string[]> {
  const files: string[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    await Promise.all(
      entries.map(async (entry) => {
        const absolute = resolve(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(absolute);
          return;
        }
        if (!entry.isFile()) return;
        files.push(relative(root, absolute).replaceAll(sep, "/"));
      }),
    );
  }

  await walk(root);
  return files.sort();
}
