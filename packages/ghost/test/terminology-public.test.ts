import { readdir, readFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

// Genuinely shipped/public text only. `docs/` is intentionally excluded: it
// holds non-authoritative design notes (docs/ideas/) plus the model doc
// (docs/purposes.md), where "layers" (the five-layer model) and "cascade"
// (cascade-from-ancestors) are the canonical vocabulary of the surface-model
// redesign. The guard still protects user-facing prose and emitted prompts.
const PUBLIC_TEXT_ROOTS = [
  "README.md",
  "apps/docs/src/content",
  "packages/ghost/src/skill-bundle",
  ".changeset",
] as const;

const FORBIDDEN_TERMS = [
  /\bcascade\b/i,
  /\blayer\b/i,
  /\blayers\b/i,
  /Package Chain/,
  /Intent Cascade/,
  /Selected Fingerprint Cascade/,
  /cascade_brief/,
  /layer_dirs/,
  /layerDirs/,
  /sourceLayers/,
] as const;

describe("public terminology", () => {
  it("keeps public prose and emitted prompts on selected-context vocabulary", async () => {
    const files = (
      await Promise.all(
        PUBLIC_TEXT_ROOTS.map((path) =>
          publicTextFiles(resolve(REPO_ROOT, path)),
        ),
      )
    ).flat();
    const failures: string[] = [];

    for (const file of files) {
      const text = await readFile(file, "utf-8");
      for (const term of FORBIDDEN_TERMS) {
        if (term.test(text)) {
          failures.push(`${relative(REPO_ROOT, file)} matched ${term}`);
        }
      }
    }

    expect(failures).toEqual([]);
  });
});

async function publicTextFiles(path: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await readdir(path, { withFileTypes: true }).catch(() => []);

  if (entries.length === 0) {
    return isPublicTextFile(path) ? [path] : [];
  }

  await Promise.all(
    entries.map(async (entry) => {
      const absolute = resolve(path, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await publicTextFiles(absolute)));
        return;
      }
      if (entry.isFile() && isPublicTextFile(absolute)) {
        files.push(absolute);
      }
    }),
  );

  return files.sort((a, b) =>
    relative(REPO_ROOT, a)
      .replaceAll(sep, "/")
      .localeCompare(relative(REPO_ROOT, b).replaceAll(sep, "/")),
  );
}

function isPublicTextFile(path: string): boolean {
  return /\.(md|mdx|ts)$/.test(path);
}
