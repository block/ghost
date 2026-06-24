import { readdir, readFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

const PUBLIC_TEXT_ROOTS = [
  "README.md",
  "docs",
  "apps/docs/src/content",
  "packages/ghost/src/skill-bundle",
  ".changeset",
] as const;

const EMITTED_TEXT_FILES = [
  "packages/ghost/src/context/selected-context.ts",
  "packages/ghost/src/context/entrypoint-markdown.ts",
  "packages/ghost/src/context/package-review-command.ts",
  "packages/ghost/src/review-packet.ts",
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
    const files = [
      ...(
        await Promise.all(
          PUBLIC_TEXT_ROOTS.map((path) =>
            publicTextFiles(resolve(REPO_ROOT, path)),
          ),
        )
      ).flat(),
      ...EMITTED_TEXT_FILES.map((path) => resolve(REPO_ROOT, path)),
    ];
    const failures: string[] = [];

    for (const file of files) {
      const text = sanitizePublicText(file, await readFile(file, "utf-8"));
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

function sanitizePublicText(file: string, text: string): string {
  if (!file.endsWith("packages/ghost/src/review-packet.ts")) return text;
  return text
    .split("\n")
    .filter(
      (line) =>
        !/stack\.layers|provenance\.layers|provenance.*\["layers"\]|layer\) =>/.test(
          line,
        ),
    )
    .join("\n");
}
