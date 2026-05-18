import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import {
  getEffectiveMapScopes,
  MAP_FILENAME,
  type MapFrontmatter,
  MapFrontmatterSchema,
  type MapScope,
} from "@ghost/core";
import { FINGERPRINT_FILENAME } from "ghost-scan";
import { parse as parseYaml } from "yaml";

const FINGERPRINTS_DIRNAME = "fingerprints";

export interface PathFingerprintResolution {
  changed_path: string;
  fingerprint_path: string;
  fallback: boolean;
  scope_id?: string;
  reason?: "no-scope-match" | "scope-fingerprint-missing";
}

export interface ResolveFingerprintsForPathsOptions {
  map?: MapFrontmatter;
}

/**
 * Resolve the governing fingerprint for each changed path in a scan
 * directory. Paths matching a product-surface scope use
 * `fingerprints/<scope>.md`; everything else falls back to `fingerprint.md`.
 */
export async function resolveFingerprintsForPaths(
  scanDir: string,
  changedPaths: string[],
  options: ResolveFingerprintsForPathsOptions = {},
): Promise<PathFingerprintResolution[]> {
  const root = resolve(scanDir);
  const map = options.map ?? (await readMap(root));
  const scopes = getEffectiveMapScopes(map).sort(compareScopeSpecificity);

  return changedPaths.map((changedPath) => {
    const normalized = normalizeChangedPath(root, changedPath);
    const scope = scopes.find((candidate) =>
      candidate.paths.some((pattern) => matchesScopePath(normalized, pattern)),
    );

    if (!scope) {
      return parentResolution(root, changedPath, "no-scope-match");
    }

    const scopedPath = join(root, FINGERPRINTS_DIRNAME, `${scope.id}.md`);
    if (!existsSync(scopedPath)) {
      return {
        ...parentResolution(root, changedPath, "scope-fingerprint-missing"),
        scope_id: scope.id,
      };
    }

    return {
      changed_path: changedPath,
      fingerprint_path: scopedPath,
      fallback: false,
      scope_id: scope.id,
    };
  });
}

async function readMap(root: string): Promise<MapFrontmatter> {
  const raw = await readFile(join(root, MAP_FILENAME), "utf-8");
  const frontmatter = splitFrontmatter(raw);
  if (!frontmatter) {
    throw new Error("map.md is missing a YAML frontmatter block");
  }
  const result = MapFrontmatterSchema.safeParse(parseYaml(frontmatter));
  if (!result.success) {
    throw new Error(
      `map.md frontmatter failed validation: ${result.error.issues
        .map((issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`)
        .join("; ")}`,
    );
  }
  return result.data;
}

function parentResolution(
  root: string,
  changedPath: string,
  reason: PathFingerprintResolution["reason"],
): PathFingerprintResolution {
  return {
    changed_path: changedPath,
    fingerprint_path: join(root, FINGERPRINT_FILENAME),
    fallback: true,
    reason,
  };
}

function compareScopeSpecificity(a: MapScope, b: MapScope): number {
  const aMax = Math.max(...a.paths.map((path) => path.length));
  const bMax = Math.max(...b.paths.map((path) => path.length));
  return bMax - aMax || a.id.localeCompare(b.id);
}

function normalizeChangedPath(root: string, changedPath: string): string {
  const rel = isAbsolute(changedPath)
    ? relative(root, changedPath)
    : changedPath;
  return rel.replaceAll("\\", "/").replace(/^\.\//, "");
}

function matchesScopePath(changedPath: string, scopePath: string): boolean {
  const pattern = scopePath.replaceAll("\\", "/").replace(/^\.\//, "");
  if (pattern.includes("*")) {
    return globToRegExp(pattern).test(changedPath);
  }

  const normalized = pattern.replace(/\/$/, "");
  return changedPath === normalized || changedPath.startsWith(`${normalized}/`);
}

function globToRegExp(glob: string): RegExp {
  let out = "^";
  for (let i = 0; i < glob.length; i++) {
    const char = glob[i];
    const next = glob[i + 1];
    if (char === "*" && next === "*") {
      out += ".*";
      i += 1;
    } else if (char === "*") {
      out += "[^/]*";
    } else {
      out += escapeRegExp(char);
    }
  }
  out += "$";
  return new RegExp(out);
}

function escapeRegExp(value: string): string {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

function splitFrontmatter(raw: string): string | null {
  const lines = raw.replace(/^﻿/, "").split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return null;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]?.trim() === "---") {
      return lines.slice(1, i).join("\n");
    }
  }
  return null;
}
