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
 * Scaffold a `.haunt/` package: a manifest plus one self-teaching example per
 * tier (a tenet, an inventory entry with `paths`, a surface that honors + uses
 * them, and a check that grounds in both). The result validates clean, so
 * `haunt validate` and `haunt review` work immediately and the shape teaches
 * itself.
 */
export async function runInit(options: InitOptions): Promise<InitResult> {
  const dir = resolve(process.cwd(), options.package ?? ".haunt");
  const id = options.id ?? "fingerprint";

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
    ["tenets/composition.md", TENET],
    ["inventory/modals.md", INVENTORY],
    ["surfaces/checkout.md", SURFACE],
    ["checks/density-does-not-creep.md", CHECK],
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

const TENET = `---
description: How the product surface holds hierarchy, density, and restraint.
---

Restraint is the default. A surface earns density; it does not start dense.
Hierarchy stays legible under change — the primary action stays unmistakable.
`;

const INVENTORY = `---
description: Dialogs, sheets, and overlays.
paths:
  - packages/geist/src/Modal/**
  - apps/site/components/overlays/**
---

Modals are for interruptions that must be resolved before continuing.
No nested modals. The body scrolls; header and footer stay fixed.
`;

const SURFACE = `---
description: The payment surface.
honors:
  - composition
uses:
  - modals
---

Checkout runs dense on purpose — but earns it with hierarchy and spacing,
not by stacking competing emphasis.
`;

const CHECK = `---
description: Density must not exceed what the surface earns.
grounds:
  - tenets/composition
  - surfaces/checkout
severity: high
---

Grade whether the change increases visual density beyond what the surface earns.
Look for: more elements per region, reduced whitespace, competing emphasis.
This is not a token check — a change can pass every lint and still collapse
hierarchy.
`;
