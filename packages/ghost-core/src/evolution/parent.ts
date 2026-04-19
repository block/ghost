import { resolve } from "node:path";
import { resolveTarget } from "../config.js";
import {
  EXPRESSION_FILENAME,
  LEGACY_FINGERPRINT_FILENAME,
  loadExpression,
  parseExpression,
} from "../expression/index.js";
import type { DesignFingerprint, Target } from "../types.js";

/**
 * Resolve a Target to a DesignFingerprint.
 *
 * - "path": reads a local expression.md (preferred), falling back to the
 *   legacy .ghost-fingerprint.json, or a direct file path to either.
 * - "url": fetches a remote fingerprint JSON or expression.md (by extension)
 * - "npm": resolves node_modules/<name>/expression.md, then legacy JSON
 * - "github": not yet supported for direct resolution (use profile flow instead)
 */
export async function resolveParent(
  target: Target,
  cwd: string = process.cwd(),
): Promise<DesignFingerprint> {
  switch (target.type) {
    case "path": {
      const resolved = resolve(cwd, target.value);
      if (resolved.endsWith(".md") || resolved.endsWith(".json")) {
        return readFingerprintFile(resolved);
      }
      // Directory: prefer expression.md, fall back to legacy JSON
      return readFingerprintFromDir(resolved);
    }

    case "url":
    case "registry": {
      const response = await fetch(target.value);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch parent fingerprint from ${target.value}: ${response.status}`,
        );
      }
      if (target.value.endsWith(".md")) {
        return parseExpression(await response.text()).fingerprint;
      }
      return (await response.json()) as DesignFingerprint;
    }

    case "npm": {
      return readFingerprintFromDir(resolve(cwd, "node_modules", target.value));
    }

    default:
      throw new Error(
        `Cannot resolve parent fingerprint from target type "${target.type}". Use "ghost profile" to generate one first.`,
      );
  }
}

async function readFingerprintFile(path: string): Promise<DesignFingerprint> {
  try {
    return (await loadExpression(path)).fingerprint;
  } catch (err) {
    throw new Error(
      `Could not read fingerprint at ${path}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

async function readFingerprintFromDir(dir: string): Promise<DesignFingerprint> {
  const mdPath = resolve(dir, EXPRESSION_FILENAME);
  try {
    return (await loadExpression(mdPath)).fingerprint;
  } catch {
    const jsonPath = resolve(dir, LEGACY_FINGERPRINT_FILENAME);
    return readFingerprintFile(jsonPath);
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
