import { access } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { classifyContractReference } from "#ghost-core";
import { FINGERPRINT_PACKAGE_DIR } from "./constants.js";

export interface ResolveContractOptions {
  /** The package dir name to look for inside a resolved contract (default `.ghost`). */
  ghostDir?: string;
}

/**
 * Resolve a binding `contract:` reference to the contract's `.ghost/` directory.
 *
 * - `.` → the in-repo root contract at `<repoRoot>/<ghostDir>`.
 * - npm name → the nearest `node_modules/<name>/<ghostDir>` walking up from
 *   `fromDir` to `repoRoot`.
 *
 * Filesystem-only: installing the package is the host's job. Returns `null` when
 * the contract cannot be resolved or the reference kind is unsupported.
 */
export async function resolveContractDir(
  reference: string,
  fromDir: string,
  repoRoot: string,
  options: ResolveContractOptions = {},
): Promise<string | null> {
  const ghostDir = options.ghostDir ?? FINGERPRINT_PACKAGE_DIR;
  const kind = classifyContractReference(reference);

  if (kind === "in-repo") {
    const dir = resolve(repoRoot, ghostDir);
    return (await exists(dir)) ? dir : null;
  }

  if (kind === "npm") {
    let current = isAbsolute(fromDir) ? fromDir : resolve(repoRoot, fromDir);
    while (isWithinOrEqual(repoRoot, current)) {
      const candidate = join(current, "node_modules", reference, ghostDir);
      if (await exists(candidate)) return candidate;
      if (current === repoRoot) break;
      current = dirname(current);
    }
    return null;
  }

  return null;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function isWithinOrEqual(root: string, candidate: string): boolean {
  const rel = relative(root, candidate);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}
