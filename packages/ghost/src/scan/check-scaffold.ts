import { access, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { UsageError } from "#ghost-core";
import { GHOST_CHECKS_DIR } from "./check-files.js";
import { loadPayloadFile } from "./packed-payloads.js";

const EXAMPLE_CHECK_FILENAME = "example.md.example";
const MEDIAN_TELLS_FILENAME = "median-tells.md";

/**
 * Node ids that carry the measured model-defaults floor. The packed
 * median-tells check references the current id; when a package still uses a
 * legacy id, the references are rewritten so the scaffolded check resolves.
 */
const MODEL_DEFAULTS_NODE_ID = "standard.model-defaults";
const LEGACY_MODEL_DEFAULTS_NODE_IDS = ["cliche.median"];

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
  const modelDefaultsId = await findModelDefaultsNode(packageDir);
  if (modelDefaultsId !== undefined) {
    let check = await loadPayloadFile("median", MEDIAN_TELLS_FILENAME);
    if (modelDefaultsId !== MODEL_DEFAULTS_NODE_ID) {
      check = check.replaceAll(MODEL_DEFAULTS_NODE_ID, modelDefaultsId);
    }
    await writeFile(join(checksDir, MEDIAN_TELLS_FILENAME), check, "utf-8");
    written.push(MEDIAN_TELLS_FILENAME);
  } else {
    skipped.push(
      `${MEDIAN_TELLS_FILENAME} (no ${MODEL_DEFAULTS_NODE_ID} node)`,
    );
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

async function findModelDefaultsNode(
  packageDir: string,
): Promise<string | undefined> {
  for (const id of [
    MODEL_DEFAULTS_NODE_ID,
    ...LEGACY_MODEL_DEFAULTS_NODE_IDS,
  ]) {
    if (await exists(join(packageDir, `${id}.md`))) return id;
  }
  return undefined;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
