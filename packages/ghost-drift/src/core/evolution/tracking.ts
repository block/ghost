import { resolve } from "node:path";
import type { Fingerprint, Target } from "@ghost/core";
import { resolveTarget } from "@ghost/core";
import {
  loadFingerprint,
  PROFILE_FILENAME,
  parseFingerprint,
  resolveFingerprintPackage,
} from "ghost-fingerprint";

/**
 * Resolve a Target to a Fingerprint.
 *
 * - "path": reads a local fingerprint.md, or a directory containing one.
 * - "url": fetches a remote fingerprint.md
 * - "npm": resolves node_modules/<name>/fingerprint.md
 * - "github": not yet supported for direct resolution (use profile flow instead)
 */
export async function resolveTrackedFingerprint(
  target: Target,
  cwd: string = process.cwd(),
): Promise<Fingerprint> {
  switch (target.type) {
    case "path": {
      const resolved = resolve(cwd, target.value);
      if (resolved.endsWith(".md")) {
        return readFingerprintFile(resolved);
      }
      return readFingerprintFromDir(resolved);
    }

    case "url":
    case "registry": {
      const response = await fetch(target.value);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch tracked fingerprint from ${target.value}: ${response.status}`,
        );
      }
      return parseFingerprint(await response.text()).fingerprint;
    }

    case "npm": {
      return readFingerprintFromDir(resolve(cwd, "node_modules", target.value));
    }

    default:
      throw new Error(
        `Cannot resolve tracked fingerprint from target type "${target.type}". Generate one first by running the profile recipe in your host agent (install with "ghost-drift emit skill").`,
      );
  }
}

async function readFingerprintFile(path: string): Promise<Fingerprint> {
  try {
    return (await loadFingerprint(path)).fingerprint;
  } catch (err) {
    throw new Error(
      `Could not read fingerprint at ${path}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

async function readFingerprintFromDir(dir: string): Promise<Fingerprint> {
  try {
    return await readFingerprintFile(
      resolveFingerprintPackage(undefined, dir).profile,
    );
  } catch {
    return readFingerprintFile(resolve(dir, PROFILE_FILENAME));
  }
}

/**
 * Normalize a config tracks value to a Target.
 * Accepts a Target directly, or a string shorthand resolved via resolveTarget().
 */
export function normalizeTrackedSource(
  value: Target | string | undefined,
): Target | undefined {
  if (!value) return undefined;
  if (typeof value === "string") {
    return resolveTarget(value);
  }
  return value;
}
