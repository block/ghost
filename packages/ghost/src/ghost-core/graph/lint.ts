import { GHOST_GRAPH_ROOT_ID, type GhostGraph } from "./types.js";

export type GraphLintSeverity = "error" | "warning" | "info";

export interface GraphLintIssue {
  severity: GraphLintSeverity;
  rule: string;
  message: string;
  /** The node id the issue concerns, when applicable. */
  node?: string;
}

export interface GraphLintReport {
  issues: GraphLintIssue[];
  errors: number;
  warnings: number;
  info: number;
}

/**
 * The graph pass of `validate`: the ghost-specific network is correct.
 *
 * - every `under` parent resolves to a node or a declared surface tree position;
 * - every local `relates` target resolves (cross-package `pkg#id` refs are
 *   skipped here — they are resolved in the cross-package phase);
 * - exactly one root (no `under`) — the implicit `core`;
 * - the containment graph is acyclic.
 *
 * Pure: operates on the assembled in-memory graph, no I/O.
 */
export function lintGraph(graph: GhostGraph): GraphLintReport {
  const issues: GraphLintIssue[] = [];
  const ids = new Set(graph.nodes.keys());
  // Valid containment targets: nodes, declared surface tree positions, and the
  // implicit root. Surfaces are tree positions (in parents/children), not nodes.
  const treePositions = new Set<string>([
    GHOST_GRAPH_ROOT_ID,
    ...graph.parents.keys(),
    ...graph.children.keys(),
  ]);

  for (const node of graph.nodes.values()) {
    // under must resolve to a known node or surface tree position
    if (
      node.under !== undefined &&
      !ids.has(node.under) &&
      !treePositions.has(node.under)
    ) {
      issues.push({
        severity: "error",
        rule: "unresolved-parent",
        message: `node '${node.id}' is under '${node.under}', which is not a known node or surface.`,
        node: node.id,
      });
    }
    // relates targets must resolve (local refs only here)
    for (const relation of node.relates) {
      if (relation.to.includes("#")) continue; // cross-package: later phase
      if (!ids.has(relation.to)) {
        issues.push({
          severity: "error",
          rule: "unresolved-relation",
          message: `node '${node.id}' relates to '${relation.to}', which does not exist.`,
          node: node.id,
        });
      }
    }
  }

  // Exactly one root: the implicit core. Nodes with no `under` are roots.
  const roots = [...graph.nodes.values()].filter(
    (node) => node.under === undefined && node.id !== GHOST_GRAPH_ROOT_ID,
  );
  for (const root of roots) {
    issues.push({
      severity: "error",
      rule: "multiple-roots",
      message: `node '${root.id}' has no 'under'; every node must descend from the implicit '${GHOST_GRAPH_ROOT_ID}' root (give it an 'under').`,
      node: root.id,
    });
  }

  // Cycle detection over containment.
  for (const node of graph.nodes.values()) {
    const seen = new Set<string>();
    let cursor: string | undefined = node.id;
    while (cursor !== undefined) {
      if (seen.has(cursor)) {
        issues.push({
          severity: "error",
          rule: "containment-cycle",
          message: `node '${node.id}' is part of an 'under' cycle.`,
          node: node.id,
        });
        break;
      }
      seen.add(cursor);
      cursor = graph.nodes.get(cursor)?.under;
    }
  }

  return finalize(issues);
}

function finalize(issues: GraphLintIssue[]): GraphLintReport {
  return {
    issues,
    errors: issues.filter((i) => i.severity === "error").length,
    warnings: issues.filter((i) => i.severity === "warning").length,
    info: issues.filter((i) => i.severity === "info").length,
  };
}
