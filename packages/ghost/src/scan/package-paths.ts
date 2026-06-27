import { execFile } from "node:child_process";
import { isAbsolute, resolve } from "node:path";
import { promisify } from "node:util";
import { FINGERPRINT_PACKAGE_DIR } from "./constants.js";

const execFileAsync = promisify(execFile);

/**
 * Neutral home for the load-bearing package-path helpers. These survive the
 * removal of nesting/stacks (see docs/ideas/one-road.md, Step 0): they are
 * direct package addressing, not nesting machinery, and are consumed by
 * fingerprint-commands, verify-package, init-command, scan-emit-command,
 * monorepo-init-command, and the scan/index re-exports.
 */

export async function resolveGitRoot(cwd = process.cwd()): Promise<string> {
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["rev-parse", "--show-toplevel"],
      {
        cwd,
      },
    );
    return resolve(stdout.trim());
  } catch {
    return resolve(cwd);
  }
}

export function normalizeGhostDir(ghostDir = FINGERPRINT_PACKAGE_DIR): string {
  const normalized = ghostDir
    .trim()
    .replaceAll("\\", "/")
    .replace(/\/+/g, "/")
    .replace(/\/$/g, "");
  if (!normalized) {
    throw new Error("GHOST_PACKAGE_DIR must not be empty");
  }
  if (
    isAbsolute(ghostDir) ||
    normalized.startsWith("/") ||
    /^[A-Za-z]:/.test(normalized)
  ) {
    throw new Error("GHOST_PACKAGE_DIR must be a relative directory path");
  }
  const segments = normalized.split("/");
  if (
    segments.some(
      (segment) => segment === "." || segment === ".." || segment === "",
    )
  ) {
    throw new Error(
      "GHOST_PACKAGE_DIR must not contain '.', '..', or empty path segments",
    );
  }
  return normalized;
}

export const GHOST_PACKAGE_DIR_ENV = "GHOST_PACKAGE_DIR";

export function resolveGhostDirDefault(
  explicitGhostDir?: unknown,
  env: NodeJS.ProcessEnv = process.env,
): string {
  return normalizeGhostDir(
    typeof explicitGhostDir === "string"
      ? explicitGhostDir
      : env[GHOST_PACKAGE_DIR_ENV],
  );
}

export function fingerprintPackageDisplayPath(
  relativeRoot: string,
  ghostDir = FINGERPRINT_PACKAGE_DIR,
): string {
  const normalizedGhostDir = normalizeGhostDir(ghostDir);
  return relativeRoot === "."
    ? normalizedGhostDir
    : `${relativeRoot}/${normalizedGhostDir}`;
}
