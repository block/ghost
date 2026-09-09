import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import type { SkillBundleFile } from "#ghost-core";
import { isMissingPathError } from "../internal/fs.js";

export type SkillCheckResult = {
  targetDir: string;
  checked: string[];
  missing: string[];
  changed: string[];
  extra: string[];
  matches: boolean;
  reinstallCommand: string;
};

export async function checkSkillInstall(
  targetDir: string,
  bundle: SkillBundleFile[],
): Promise<SkillCheckResult> {
  const expected = bundle
    .map((file) => ({ ...file, path: file.path.replaceAll("\\", "/") }))
    .filter(
      (file) => file.path === "SKILL.md" || file.path.startsWith("references/"),
    )
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  const missing: string[] = [];
  const changed: string[] = [];
  for (const file of expected) {
    const absolute = join(targetDir, file.path);
    try {
      if (
        !(await stat(absolute)).isFile() ||
        (await readFile(absolute, "utf-8")) !== file.content
      ) {
        changed.push(file.path);
      }
    } catch (err) {
      if (!isMissingPathError(err)) throw err;
      missing.push(file.path);
    }
  }

  const checked = expected.map((file) => file.path);
  const expectedPaths = new Set(checked);
  const extra = (await listReferenceFiles(targetDir))
    .filter((path) => !expectedPaths.has(path))
    .sort();
  return {
    targetDir,
    checked,
    missing,
    changed,
    extra,
    matches: missing.length === 0 && changed.length === 0 && extra.length === 0,
    reinstallCommand: `ghost skill install --dest '${targetDir.replaceAll("'", "'\\''")}' --force`,
  };
}

async function listReferenceFiles(targetDir: string): Promise<string[]> {
  const root = join(targetDir, "references");
  try {
    if (!(await stat(root)).isDirectory()) return [];
  } catch (err) {
    if (isMissingPathError(err)) return [];
    throw err;
  }
  const paths: string[] = [];
  async function walk(dir: string, prefix: string): Promise<void> {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = `${prefix}/${entry.name}`;
      if (entry.isDirectory()) await walk(join(dir, entry.name), path);
      // Include symlinks (even dangling ones) without following extra targets.
      else paths.push(path);
    }
  }
  await walk(root, "references");
  return paths;
}

export function formatSkillCheckResult(result: SkillCheckResult): string {
  const lines = [
    "ghost skill check",
    `Target: ${result.targetDir}`,
    result.matches
      ? "Result: installed files match the bundled ghost skill instructions."
      : "Result: installed files differ from the bundled ghost skill instructions.",
    "",
  ];
  const sections: [string, string[]][] = result.matches
    ? [["Checked files", result.checked]]
    : [
        ["Missing files", result.missing],
        ["Changed files", result.changed],
        ["Extra reference files", result.extra],
      ];
  for (const [title, paths] of sections) {
    if (paths.length)
      lines.push(`${title}:`, ...paths.map((path) => `  ${path}`), "");
  }
  if (!result.matches)
    lines.push("Reinstall with:", `  ${result.reinstallCommand}`, "");
  lines.push(
    "This only compares SKILL.md and references/ to the bundled ghost skill instructions.",
    "It does not prove the skill is runtime-active or semantically compatible with any host agent.",
    "",
  );
  return lines.join("\n");
}
