import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { HAUNT_PACKAGE_SCHEMA } from "../model/schema.js";

export interface InitOptions {
  package?: string;
  id?: string;
  force?: boolean;
}

export interface InitResult {
  written: string[];
  dir: string;
  code: number;
  message?: string;
}

/**
 * Scaffold a `.haunt/` package: a manifest, one inventory example with
 * `paths`, and one `ghost.check/v1` check whose `references` demonstrate the
 * grammar — a bare local inventory id plus a fingerprint-shaped
 * `node > Heading` target. The scaffold loads clean; the fingerprint-shaped
 * reference is expected to dangle until you author the `.ghost/` node it
 * names (`haunt validate` surfaces that as a warning, not an error).
 */
export async function runInit(options: InitOptions): Promise<InitResult> {
  const dir = resolve(process.cwd(), options.package ?? ".haunt");
  const id = options.id ?? "haunt";

  if (existsSync(join(dir, "manifest.yml")) && !options.force) {
    return {
      written: [],
      dir,
      code: 3,
      message: `${dir}/manifest.yml already exists. Pass --force to overwrite.`,
    };
  }

  const files: Array<[string, string]> = [
    ["manifest.yml", `schema: ${HAUNT_PACKAGE_SCHEMA}\nid: ${id}\n`],
    ["inventory/modals.md", INVENTORY],
    ["checks/contracts-stay-congruent.md", CHECK],
  ];

  const written: string[] = [];
  for (const [rel, content] of files) {
    const path = join(dir, rel);
    await mkdir(join(dir, rel, ".."), { recursive: true });
    await writeFile(path, content, "utf-8");
    written.push(rel);
  }
  return { written, dir, code: 0 };
}

const INVENTORY = `---
description: Dialogs, sheets, and overlays.
paths:
  - packages/geist/src/Modal/**
  - apps/site/components/overlays/**
---

Modals are for interruptions that must be resolved before continuing.
No nested modals. The body scrolls; header and footer stay fixed.
`;

const CHECK = `---
name: contracts-stay-congruent
description: Modal contracts stay congruent across the material.
severity: high
references:
  - modals
  - checkout > Density
---

Grade whether the modal components expose congruent contracts: equivalent
props share names (one of onClose/onDismiss, never both), variants line up,
and the same composition is not solved two different ways. In a diff, grade
the change against the material's existing contract; in an integrity audit,
grade the whole material against itself and its siblings.
`;
