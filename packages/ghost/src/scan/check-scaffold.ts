import { access, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { UsageError } from "#ghost-core";
import { GHOST_CHECKS_DIR } from "./check-files.js";

const EXAMPLE_CHECK_FILENAME = "example.md.example";

const EXAMPLE_CHECK_CONTENT = `---
name: logo-clearspace-holds
description: Logo usage preserves clearspace, lockup integrity, and glyph rules.
severity: medium
references:
  - asset.logo
---

Grade whether the change preserves the logo guidance in \`asset.logo\`. Flag
compressed clearspace, altered lockups, stretched marks, or cases where the glyph
is used when the full lockup is required.
`;

export interface AddChecksResult {
  dir: string;
  written: string[];
}

/** Scaffold the flat `.ghost/checks/` directory with an example check. */
export async function addChecksDir(
  packageDir: string,
): Promise<AddChecksResult> {
  const checksDir = join(packageDir, GHOST_CHECKS_DIR);
  if (await exists(checksDir)) {
    throw new UsageError(`checks/ already exists at ${checksDir}.`);
  }

  await mkdir(checksDir, { recursive: true });
  await writeFile(
    join(checksDir, EXAMPLE_CHECK_FILENAME),
    EXAMPLE_CHECK_CONTENT,
    "utf-8",
  );
  return { dir: checksDir, written: [EXAMPLE_CHECK_FILENAME] };
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
