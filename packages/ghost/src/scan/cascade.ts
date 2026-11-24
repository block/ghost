import { isAbsolute, relative, sep } from "node:path";
import {
  type GhostCatalogNode,
  sliceNodeSection,
  UsageError,
} from "#ghost-core";
import type { LoadedGhostPackage } from "./ghost-package.js";
import type { GhostProvenance } from "./package-hash.js";

export interface GhostUniversalVersionWarning {
  code: "universal-version-mismatch";
  severity: "warning";
  file: "manifest.yml";
  message: string;
  expectedVersion: string;
  actualVersion: string;
}

export interface GhostCascade {
  core: readonly string[];
  automatic: readonly string[];
  universalDir?: string;
  universalNodeIds: readonly string[];
  hasAuthoredFallback: boolean;
  provenance: GhostProvenance;
  versionWarning?: GhostUniversalVersionWarning;
}

export class CascadeGraphError extends UsageError {
  constructor(readonly issues: readonly string[]) {
    super(issues.join("\n"));
  }
}

export function validateCore(
  pkg: LoadedGhostPackage,
  report: (message: string) => void,
): string[] {
  const core = pkg.manifest.core ?? [];
  for (const id of core) {
    if (pkg.catalog.nodes.has(id)) continue;
    const owner = `Package "${pkg.manifest.id}"`;
    const invalid = pkg.invalid.find(({ file }) => file === `${id}.md`);
    report(
      invalid
        ? `${owner} core node "${id}" could not be loaded: ${invalid.message}`
        : `${owner} core node "${id}" must exist in the declaring package.`,
    );
  }
  return core;
}

const FALLBACK_POLICY_HEADING = "If no guidance applies";

const LEGACY_FALLBACK_HEADING = new RegExp(
  `^##[ \t]+${FALLBACK_POLICY_HEADING}[ \t]*$`,
  "im",
);

export function fallbackPolicy(
  body: string,
  { legacy = false } = {},
): string | undefined {
  // Released cover packages treat the heading alone as an authored policy.
  if (legacy) return LEGACY_FALLBACK_HEADING.exec(body)?.[0];
  return sliceNodeSection(body, FALLBACK_POLICY_HEADING)?.trim() || undefined;
}

export function hasAuthoredFallback(
  automatic: readonly Readonly<GhostCatalogNode>[],
  ownerOf: (id: string) => string,
): boolean {
  const policies = new Set<string>();
  const sources: string[] = [];
  for (const node of automatic) {
    const policy = fallbackPolicy(node.body);
    if (!policy) continue;
    policies.add(policy);
    sources.push(`"${node.id}" (package "${ownerOf(node.id)}")`);
  }
  if (policies.size > 1) {
    throw new UsageError(
      `More than one distinct "If no guidance applies" policy in automatic guidance: ${sources.join(", ")}.`,
    );
  }
  return policies.size > 0;
}

/** Visit prerequisites in declaration order, once, before delivering a root. */
export function dependencyClosure(
  nodes: ReadonlyMap<string, Readonly<GhostCatalogNode>>,
  roots: readonly string[],
  validation?: {
    report: (message: string) => void;
    allows: (from: string, target: string) => boolean;
    missing: (from: string, target: string) => string;
  },
): Readonly<GhostCatalogNode>[] {
  function fail(message: string): void {
    if (validation) validation.report(message);
    else throw new UsageError(message);
  }

  const delivered = new Map<string, Readonly<GhostCatalogNode>>();
  const visiting = new Set<string>();

  function visit(id: string, from?: string): void {
    if (from !== undefined && validation && !validation.allows(from, id)) {
      fail(validation.missing(from, id));
      return;
    }
    if (delivered.has(id)) return;
    if (visiting.has(id)) {
      const cycle = [...visiting];
      fail(
        `Dependency cycle: ${[...cycle.slice(cycle.indexOf(id)), id].join(" -> ")}.`,
      );
      return;
    }
    const node = nodes.get(id);
    if (!node) {
      fail(`Node "${from}" requires missing node "${id}".`);
      return;
    }
    visiting.add(id);
    for (const dependency of node.requires ?? []) visit(dependency, id);
    visiting.delete(id);
    delivered.set(id, node);
  }

  for (const root of roots) visit(root);
  return [...delivered.values()];
}

export const CASCADE_RULE_AUTHORITY =
  "Guidance moves from general to specific; universal guidance is followed by the brand's guidance. A node's `requires` field lists the nodes it builds on. Where a node's rule differs from a rule in a node it requires, directly or through other nodes, follow the node's own rule; the rest of the required node still applies. A rule marked `!important` is the exception: only another `!important` rule in a node that requires it can override it. If rules conflict and neither node `requires` the other, directly or through other nodes, report the conflict instead of guessing.";

export function cascadeClosure(
  nodes: ReadonlyMap<string, Readonly<GhostCatalogNode>>,
  roots: readonly string[],
  universalNodeIds: Iterable<string>,
): Readonly<GhostCatalogNode>[] {
  const universalIds = new Set(universalNodeIds);
  const universal: Readonly<GhostCatalogNode>[] = [];
  const primary: Readonly<GhostCatalogNode>[] = [];
  for (const node of dependencyClosure(nodes, roots)) {
    (universalIds.has(node.id) ? universal : primary).push(node);
  }
  // Universal nodes only require other universal nodes, so grouping by
  // package preserves prerequisite order.
  return [...universal, ...primary];
}

/** The caller's repository contains usual materials; an external package owns its directory. */
export function materialRoot(packageDir: string, repoRoot: string): string {
  const path = relative(repoRoot, packageDir);
  return path === ".." || path.startsWith(`..${sep}`) || isAbsolute(path)
    ? packageDir
    : repoRoot;
}
