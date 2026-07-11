import { access, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { UsageError } from "#ghost-core";
import { GHOST_CHECKS_DIR } from "./check-files.js";
import { loadPayloadFile } from "./packed-payloads.js";

const EXAMPLE_CHECK_FILENAME = "example.md.example";
const MEDIAN_TELLS_FILENAME = "median-tells.md";

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
  skipped: string[];
}

/** Scaffold the flat `.ghost/checks/` directory with an example check. */
export async function addChecksDir(
  packageDir: string,
): Promise<AddChecksResult> {
  const checksDir = join(packageDir, GHOST_CHECKS_DIR);
  if (await exists(checksDir)) {
    throw new UsageError(`checks/ already exists at ${checksDir}.`);
  }

  const written: string[] = [];
  const skipped: string[] = [];

  await mkdir(checksDir, { recursive: true });
  if (await exists(join(packageDir, "cliche.median.md"))) {
    await writeFile(
      join(checksDir, MEDIAN_TELLS_FILENAME),
      await loadPayloadFile("median", MEDIAN_TELLS_FILENAME),
      "utf-8",
    );
    written.push(MEDIAN_TELLS_FILENAME);
  } else {
    skipped.push(`${MEDIAN_TELLS_FILENAME} (no cliche.median node)`);
  }

  await writeFile(
    join(checksDir, EXAMPLE_CHECK_FILENAME),
    EXAMPLE_CHECK_CONTENT,
    "utf-8",
  );
  written.push(EXAMPLE_CHECK_FILENAME);

  return {
    dir: checksDir,
    written,
    skipped,
  };
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
