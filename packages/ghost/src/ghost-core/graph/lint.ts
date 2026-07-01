import type { GhostGraph } from "./types.js";

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
 * Containment comes from the directory tree — a node's parent is its containing
 * directory, derived from its id — so the containment graph is a tree by
 * construction: it reaches the single `core` root and cannot cycle. Neither
 * needs checking. What remains is the network correctness the layout cannot
 * guarantee: every local `relates` target resolves (cross-package `pkg:id`
 * refs resolve against inherited nodes; an unknown one is reported).
 *
 * Pure: operates on the assembled in-memory graph, no I/O.
 */
export function lintGraph(graph: GhostGraph): GraphLintReport {
  const issues: GraphLintIssue[] = [];
  const ids = new Set(graph.nodes.keys());

  for (const node of graph.nodes.values()) {
    // relates targets must resolve. A `<package-id>:<node>` ref resolves to an
    // inherited node (id-keyed the same way) — same lookup, no special case.
    for (const relation of node.relates) {
      if (!ids.has(relation.to)) {
        issues.push({
          severity: "error",
          rule: "unresolved-relation",
          message: `node '${node.id}' relates to '${relation.to}', which does not exist (a cross-package ref needs the package in 'extends').`,
          node: node.id,
        });
      }
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
