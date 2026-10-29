import type { GhostPackageManifest } from "../package-manifest.js";
import type { GhostCatalogNode } from "./types.js";

export const LAYERED_AUTHORITY =
  "A more specific rule replaces or augments the rule it names, within the scope it states. Everything it doesn't name still applies. Required: exempts a rule from the cascade. A required rule cannot be replaced within its stated scope, wherever it lives. It is reserved for accessibility and legal obligations and documented technical limits, and it carries its reason and scope in the same bullet. The requires field declares delivery dependencies, not overrides. Report unresolved conflicts rather than guessing. Delivery order confers no authority.";

type Nodes = ReadonlyMap<string, Readonly<GhostCatalogNode>>;

/** Content hierarchy, independent of filename kinds and file organization. */
export function layerOrder(node: Readonly<GhostCatalogNode>): number {
  if (node.scope === "baseline") return node.layer === "fundamentals" ? 0 : 1;
  if (node.scope === "brand") {
    return node.layer === "framing" ? 2 : node.layer === "identity" ? 3 : 4;
  }
  return 5;
}

/** Structural checks only. With roots, inspect only the required pull context. */
export function inspectLayeredContext(
  nodes: Nodes,
  manifest: GhostPackageManifest,
  roots: readonly string[] = [...nodes.keys()],
): { ids: string[]; issues: { path: string; message: string }[] } {
  const issues: { path: string; message: string }[] = [];
  for (const id of manifest.core ?? []) {
    const node = nodes.get(id);
    if (!node || node.scope !== "baseline" || node.layer !== "fundamentals") {
      issues.push({
        path: "manifest.yml.core",
        message: `core "${id}" must resolve to a baseline/fundamentals node`,
      });
    }
  }
  const done = new Set<string>();
  const active = new Set<string>();
  const ids: string[] = [];
  function visit(id: string, parent?: string): void {
    if (active.has(id)) {
      issues.push({
        path: `${id}.md.requires`,
        message: `requires cycle: ${[...active, id].join(" -> ")}`,
      });
      return;
    }
    if (done.has(id)) return;
    const node = nodes.get(id);
    if (!node) {
      issues.push({
        path: parent ? `${parent}.md.requires` : `${id}.md`,
        message: `required node "${id}" is missing or invalid`,
      });
      return;
    }
    active.add(id);
    for (const dependency of node.requires ?? []) visit(dependency, id);
    active.delete(id);
    done.add(id);
    ids.push(id);
  }
  for (const id of [...(manifest.core ?? []), ...roots]) visit(id);

  return { ids, issues };
}

/** Stable broad-to-narrow ordering among ready nodes; prerequisites win. */
export function orderLayeredNodes(
  nodes: readonly GhostCatalogNode[],
): GhostCatalogNode[] {
  const pending = [...nodes].sort((a, b) => layerOrder(a) - layerOrder(b));
  const remaining = new Set(pending.map((node) => node.id));
  const ordered: GhostCatalogNode[] = [];
  while (pending.length > 0) {
    const index = pending.findIndex(
      (node) => !(node.requires ?? []).some((id) => remaining.has(id)),
    );
    // Cycles are reported before ordering by inspectLayeredContext.
    if (index < 0) throw new Error("Cannot order cyclic prerequisites");
    const [node] = pending.splice(index, 1);
    if (!node) break;
    remaining.delete(node.id);
    ordered.push(node);
  }
  return ordered;
}
