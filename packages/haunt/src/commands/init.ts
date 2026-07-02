import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  initFingerprintPackage,
  resolveFingerprintPackage,
} from "@anarchitecture/ghost-fingerprint/fingerprint";
import { resolveGhostDirDefault } from "@anarchitecture/ghost-fingerprint/scan";
import { loadFingerprint, resolveHauntDir } from "../fingerprint/load.js";

export interface InitOptions {
  /** The `.ghost/` fingerprint package dir (default: .ghost / GHOST_PACKAGE_DIR). */
  ghostDir?: string;
  force?: boolean;
}

export interface InitResult {
  written: string[];
  dir: string;
  code: number;
  message?: string;
  /** Package-relative files written when init scaffolded a missing `.ghost/`. */
  ghostWritten?: string[];
  /** Notice for stderr when init scaffolded a missing `.ghost/`. */
  notice?: string;
}

export const NO_TRUTHS_NOTICE =
  "scaffolded .ghost/ — a fingerprint with no authored truths grades nothing; author it first (ghost skill: capture)";

/**
 * Scaffold the `.ghost/haunt/` package: one inventory example with `paths`
 * and one `ghost.check/v1` check whose `references` demonstrate the grammar —
 * a bare local inventory id plus a fingerprint-shaped `node > Heading`
 * target. Haunt is a plugin of the fingerprint: it lives at
 * `<ghost dir>/haunt` and has no manifest of its own — the fingerprint's
 * `manifest.yml` is the only anchor. When no fingerprint resolves, init
 * scaffolds the default fingerprint first (same resolution as
 * review/validate: --ghost-dir, then GHOST_PACKAGE_DIR, then .ghost). The
 * scaffold loads clean; the fingerprint-shaped reference is expected to
 * dangle until you author the `.ghost/` node it names (`ghost-haunt
 * validate` surfaces that as a warning, not an error).
 */
export async function runInit(options: InitOptions): Promise<InitResult> {
  const dir = resolveHauntDir(options.ghostDir);

  let ghostWritten: string[] | undefined;
  let notice: string | undefined;
  const fingerprint = await loadFingerprint({ ghostDir: options.ghostDir });
  if (fingerprint === null) {
    const ghostDir = options.ghostDir ?? resolveGhostDirDefault();
    const paths = resolveFingerprintPackage(ghostDir, process.cwd());
    // A present-but-broken `.ghost/` is `ghost validate`'s job, not ours.
    if (!existsSync(paths.manifest)) {
      const result = await initFingerprintPackage(ghostDir, process.cwd());
      ghostWritten = result.written;
      notice = NO_TRUTHS_NOTICE;
    }
  }

  if (existsSync(dir) && !options.force) {
    return {
      written: [],
      dir,
      code: 3,
      message: `${dir} already exists. Pass --force to overwrite.`,
      ...(ghostWritten ? { ghostWritten } : {}),
      ...(notice ? { notice } : {}),
    };
  }

  const files: Array<[string, string]> = [
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
  return {
    written,
    dir,
    code: 0,
    ...(ghostWritten ? { ghostWritten } : {}),
    ...(notice ? { notice } : {}),
  };
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
