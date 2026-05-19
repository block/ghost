import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Fingerprint, MapScope } from "#ghost-core";
import { FINGERPRINT_FILENAME, FINGERPRINTS_DIRNAME } from "./constants.js";
import { loadFingerprint } from "./index.js";

export interface LoadedFingerprintNode {
  id: string;
  kind: "parent" | "scope";
  path: string;
  fingerprint: Fingerprint;
  scope_id?: string;
  parent_id?: string;
  scope?: MapScope;
}

export interface LoadedFingerprintSet {
  dir: string;
  parent?: LoadedFingerprintNode;
  scopes: LoadedFingerprintNode[];
  nodes: LoadedFingerprintNode[];
}

export interface LoadFingerprintSetOptions {
  scopes?: MapScope[];
}

/**
 * Load the parent fingerprint plus scoped overlays from a scan directory.
 * Scoped files follow `fingerprints/<scope>.md` and may extend the parent.
 */
export async function loadFingerprintSet(
  dirPath: string,
  options: LoadFingerprintSetOptions = {},
): Promise<LoadedFingerprintSet> {
  const dir = resolve(dirPath);
  const parentPath = join(dir, FINGERPRINT_FILENAME);
  const scopesDir = join(dir, FINGERPRINTS_DIRNAME);

  let parent: LoadedFingerprintNode | undefined;
  if (existsSync(parentPath)) {
    const { fingerprint } = await loadFingerprint(parentPath);
    parent = {
      id: fingerprint.id,
      kind: "parent",
      path: parentPath,
      fingerprint,
    };
  }

  const scopeById = new Map(
    (options.scopes ?? []).map((scope) => [scope.id, scope]),
  );
  const scopeIds = new Set(scopeById.keys());
  if (existsSync(scopesDir)) {
    for (const entry of readdirSync(scopesDir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      scopeIds.add(entry.name.slice(0, -".md".length));
    }
  }

  const scopes: LoadedFingerprintNode[] = [];
  for (const scopeId of [...scopeIds].sort((a, b) => a.localeCompare(b))) {
    const path = join(scopesDir, `${scopeId}.md`);
    if (!existsSync(path)) continue;
    const { fingerprint } = await loadFingerprint(path);
    scopes.push({
      id: scopeId,
      kind: "scope",
      path,
      fingerprint,
      scope_id: scopeId,
      ...(parent ? { parent_id: parent.id } : {}),
      ...(scopeById.get(scopeId) ? { scope: scopeById.get(scopeId) } : {}),
    });
  }

  return {
    dir,
    parent,
    scopes,
    nodes: parent ? [parent, ...scopes] : scopes,
  };
}
