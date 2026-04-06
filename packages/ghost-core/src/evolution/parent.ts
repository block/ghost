import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { DesignFingerprint, ParentSource } from "../types.js";

/**
 * Resolve a ParentSource to a DesignFingerprint.
 *
 * - "default": looks for .ghost-fingerprint.json in cwd (ghostui implied)
 * - "path": reads a local .ghost-fingerprint.json or fingerprint JSON file
 * - "url": fetches a remote fingerprint JSON
 * - "package": resolves node_modules/<name>/.ghost-fingerprint.json
 */
export async function resolveParent(
  source: ParentSource,
  cwd: string = process.cwd(),
): Promise<DesignFingerprint> {
  switch (source.type) {
    case "default":
      throw new Error(
        "No parent declared. Set `parent` in ghost.config.ts or use --parent.",
      );

    case "path": {
      const resolved = resolve(cwd, source.path);
      // If it points to a directory, look for .ghost-fingerprint.json inside it
      const target = resolved.endsWith(".json")
        ? resolved
        : resolve(resolved, ".ghost-fingerprint.json");
      return readFingerprintFile(target);
    }

    case "url": {
      const response = await fetch(source.url);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch parent fingerprint from ${source.url}: ${response.status}`,
        );
      }
      return (await response.json()) as DesignFingerprint;
    }

    case "package": {
      // Resolve from node_modules
      const target = resolve(
        cwd,
        "node_modules",
        source.name,
        ".ghost-fingerprint.json",
      );
      return readFingerprintFile(target);
    }
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
 * Normalize a config parent value to a ParentSource.
 * Accepts the discriminated union directly, or a string shorthand:
 *   - starts with http → url
 *   - otherwise → path
 */
export function normalizeParentSource(
  value: ParentSource | string | undefined,
): ParentSource {
  if (!value) return { type: "default" };
  if (typeof value === "string") {
    return value.startsWith("http")
      ? { type: "url", url: value }
      : { type: "path", path: value };
  }
  return value;
}
