import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { resolveTarget } from "../config.js";
import type { DesignFingerprint, Target } from "../types.js";

/**
 * Resolve a Target to a DesignFingerprint.
 *
 * - "path": reads a local .ghost-fingerprint.json or fingerprint JSON file
 * - "url": fetches a remote fingerprint JSON
 * - "npm": resolves node_modules/<name>/.ghost-fingerprint.json
 * - "github": not yet supported for direct resolution (use profile flow instead)
 */
export async function resolveParent(
  target: Target,
  cwd: string = process.cwd(),
): Promise<DesignFingerprint> {
  switch (target.type) {
    case "path": {
      const resolved = resolve(cwd, target.value);
      // If it points to a directory, look for .ghost-fingerprint.json inside it
      const filePath = resolved.endsWith(".json")
        ? resolved
        : resolve(resolved, ".ghost-fingerprint.json");
      return readFingerprintFile(filePath);
    }

    case "url":
    case "registry": {
      const response = await fetch(target.value);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch parent fingerprint from ${target.value}: ${response.status}`,
        );
      }
      return (await response.json()) as DesignFingerprint;
    }

    case "npm": {
      // Resolve from node_modules
      const filePath = resolve(
        cwd,
        "node_modules",
        target.value,
        ".ghost-fingerprint.json",
      );
      return readFingerprintFile(filePath);
    }

    default:
      throw new Error(
        `Cannot resolve parent fingerprint from target type "${target.type}". Use "ghost profile" to generate one first.`,
      );
  }
}

async function readFingerprintFile(path: string): Promise<DesignFingerprint> {
  try {
    const data = await readFile(path, "utf-8");
    return JSON.parse(data) as DesignFingerprint;
  } catch (err) {
    throw new Error(
      `Could not read fingerprint at ${path}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

/**
 * Normalize a config parent value to a Target.
 * Accepts a Target directly, or a string shorthand resolved via resolveTarget().
 */
export function normalizeParentSource(
  value: Target | string | undefined,
): Target | undefined {
  if (!value) return undefined;
  if (typeof value === "string") {
    return resolveTarget(value);
  }
  return value;
}
