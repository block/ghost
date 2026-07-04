import { access, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  GHOST_HAUNT_MANIFEST_FILENAME,
  GHOST_HAUNT_SCHEMA,
  UsageError,
} from "#ghost-core";
import { isMissingPathError } from "../internal/fs.js";
import { GHOST_HAUNTS_DIR, KNOWN_HAUNTS } from "./haunt-files.js";

interface HauntTemplateFile {
  relativePath: string;
  content: string;
}

interface HauntTemplate {
  id: string;
  description: string;
  files: HauntTemplateFile[];
}

const CHECKS_TEMPLATE: HauntTemplate = {
  id: "checks",
  description:
    "Review assertions bound to fingerprint nodes; consumed by `ghost review`.",
  files: [
    {
      relativePath: GHOST_HAUNT_MANIFEST_FILENAME,
      content: `schema: ${GHOST_HAUNT_SCHEMA}\nid: checks\n`,
    },
    {
      relativePath: "example.md.example",
      content: `---
name: logo-clearspace-holds
description: Logo usage preserves clearspace, lockup integrity, and glyph rules.
severity: medium
references:
  - asset.logo
---

Grade whether the change preserves the logo guidance in \`asset.logo\`. Flag
compressed clearspace, altered lockups, stretched marks, or cases where the glyph
is used when the full lockup is required.
`,
    },
  ],
};

const HAUNT_TEMPLATES = new Map<string, HauntTemplate>([
  [CHECKS_TEMPLATE.id, CHECKS_TEMPLATE],
]);

export function listHauntTemplates(): Array<{
  id: string;
  description: string;
}> {
  return [...HAUNT_TEMPLATES.values()].map(({ id, description }) => ({
    id,
    description,
  }));
}

/** Ids of haunt directories currently installed under `.ghost/haunts/`. */
export async function listInstalledHaunts(
  packageDir: string,
): Promise<string[]> {
  try {
    const entries = await readdir(join(packageDir, GHOST_HAUNTS_DIR), {
      withFileTypes: true,
    });
    return entries
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
      .map((entry) => entry.name)
      .sort();
  } catch (err) {
    if (isMissingPathError(err)) return [];
    throw err;
  }
}

export interface AddHauntResult {
  dir: string;
  written: string[];
}

/** Scaffold a first-party haunt under `.ghost/haunts/<id>/`. */
export async function addHaunt(
  packageDir: string,
  id: string,
): Promise<AddHauntResult> {
  const template = HAUNT_TEMPLATES.get(id);
  if (template === undefined) {
    throw new UsageError(
      `Unknown haunt '${id}'. Known haunts: ${KNOWN_HAUNTS.join(", ")}.`,
    );
  }

  const hauntDir = join(packageDir, GHOST_HAUNTS_DIR, id);
  if (await exists(join(hauntDir, GHOST_HAUNT_MANIFEST_FILENAME))) {
    throw new UsageError(`Haunt '${id}' is already installed at ${hauntDir}.`);
  }

  await mkdir(hauntDir, { recursive: true });
  for (const file of template.files) {
    await writeFile(join(hauntDir, file.relativePath), file.content, "utf-8");
  }
  return {
    dir: hauntDir,
    written: template.files.map((file) => file.relativePath),
  };
}

/** Remove an installed haunt directory. */
export async function removeHaunt(
  packageDir: string,
  id: string,
): Promise<string> {
  const hauntDir = join(packageDir, GHOST_HAUNTS_DIR, id);
  if (!(await exists(hauntDir))) {
    throw new UsageError(`Haunt '${id}' is not installed at ${hauntDir}.`);
  }
  await rm(hauntDir, { recursive: true });
  return hauntDir;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
