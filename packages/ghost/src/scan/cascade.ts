import { isAbsolute, relative, sep } from "node:path";
import {
  type GhostCatalogNode,
  sliceNodeSection,
  UsageError,
} from "#ghost-core";
import type { LoadedGhostPackage } from "./ghost-package.js";
import type { GhostProvenance } from "./package-hash.js";

export interface GhostCascade {
  core: readonly string[];
  automatic: readonly string[];
  universalDir?: string;
  universalNodeIds: readonly string[];
  hasAuthoredFallback: boolean;
  provenance: GhostProvenance;
  versionWarning?: string;
}

export function validateCore(pkg: LoadedGhostPackage): string[] {
  const core = pkg.manifest.core ?? [];
  for (const id of core) {
    if (!pkg.catalog.nodes.has(id)) {
      throw new UsageError(
        `Package "${pkg.manifest.id}" core node "${id}" must exist in the declaring package.`,
      );
    }
  }
  return core;
}

export function hasAuthoredFallback(
  nodes: ReadonlyMap<string, Readonly<GhostCatalogNode>>,
  core: readonly string[],
): boolean {
  const policies = new Set(
    core.flatMap((id) => {
      const node = nodes.get(id);
      if (!node) return [];
      const policy = sliceNodeSection(
        node.body,
        "If no guidance applies",
      )?.trim();
      return policy ? [policy] : [];
    }),
  );
  if (policies.size > 1) {
    throw new UsageError(
      'Conflicting "If no guidance applies" policies in core nodes.',
    );
  }
  return policies.size > 0;
}

/** Visit prerequisites in declaration order, once, before delivering a root. */
export function dependencyClosure(
  nodes: ReadonlyMap<string, Readonly<GhostCatalogNode>>,
  roots: readonly string[],
): Readonly<GhostCatalogNode>[] {
  const delivered = new Map<string, Readonly<GhostCatalogNode>>();
  const visiting = new Set<string>();

  function visit(id: string, from?: string): void {
    if (delivered.has(id)) return;
    if (visiting.has(id)) {
      throw new UsageError(
        `Dependency cycle: ${[...visiting, id].join(" -> ")}.`,
      );
    }
    const node = nodes.get(id);
    if (!node) {
      throw new UsageError(`Node "${from}" requires missing node "${id}".`);
    }
    visiting.add(id);
    for (const dependency of node.requires ?? []) visit(dependency, id);
    visiting.delete(id);
    delivered.set(id, node);
  }

  for (const root of roots) visit(root);
  return [...delivered.values()];
}

/** The caller's repository contains usual materials; an external package owns its directory. */
export function materialRoot(packageDir: string, repoRoot: string): string {
  const path = relative(repoRoot, packageDir);
  return path === ".." || path.startsWith(`..${sep}`) || isAbsolute(path)
    ? packageDir
    : repoRoot;
}
