import type { GhostFingerprintDocument } from "#ghost-core";
import {
  buildFingerprintGraph,
  type FingerprintGraph,
  type FingerprintGraphNode,
  intersects,
  matchScopes,
  type NodeRef,
  nodeMatchesTargets,
  normalizeTargetPaths,
  sortNodes,
  unique,
} from "./graph.js";
import type { PackageContext, PackageInventory } from "./package-context.js";

export type {
  FingerprintGraph,
  FingerprintGraphEdge,
  FingerprintGraphNode,
  FingerprintGraphScope,
} from "./graph.js";
export { buildFingerprintGraph } from "./graph.js";

export interface ContextEntrypoint {
  name: string;
  match: {
    status: "path-match" | "global-fallback";
    requestedPaths: string[];
    matchedScopes: string[];
    matchedSurfaceTypes: string[];
    sourceLayers: string[];
    reasons: string[];
  };
  identity: {
    product: string;
    audience: string[];
    goals: string[];
    antiGoals: string[];
    tradeoffs: string[];
    tone: string[];
  };
  selected: {
    prose: FingerprintGraphNode[];
    composition: FingerprintGraphNode[];
    exemplars: FingerprintGraphNode[];
    checks: FingerprintGraphNode[];
  };
  suggestedReads: Array<{ path: string; reason: string }>;
  omissions: Array<{ label: string; omitted: number; source: string }>;
  generatedCache: PackageInventory;
}

export interface BuildContextEntrypointOptions {
  targetPaths?: string[];
}

const CAPS = {
  prose: 6,
  composition: 6,
  exemplars: 3,
  checks: 6,
} as const;

export function buildContextEntrypoint(
  context: PackageContext,
  options: BuildContextEntrypointOptions = {},
): ContextEntrypoint {
  const graph = buildFingerprintGraph(context);
  const requestedPaths = normalizeTargetPaths(
    options.targetPaths ?? context.targetPaths ?? [],
  );
  const matchedScopes = matchScopes(graph.scopes, requestedPaths);
  const matchedScopeIds = matchedScopes.map((scope) => scope.id);
  const matchedSurfaceTypes = unique(
    matchedScopes.flatMap((scope) => scope.surfaceTypes),
  );
  const directRefs = new Set<NodeRef>();

  for (const node of graph.nodes) {
    if (
      nodeMatchesTargets(node, requestedPaths) ||
      intersects(node.appliesTo.scopes, matchedScopeIds) ||
      intersects(node.appliesTo.surfaceTypes, matchedSurfaceTypes)
    ) {
      directRefs.add(node.ref);
    }
  }

  const selectedRefs =
    directRefs.size > 0
      ? expandOneHop(directRefs, graph)
      : new Set<NodeRef>(graph.nodes.map((node) => node.ref));
  const status = directRefs.size > 0 ? "path-match" : "global-fallback";
  const selected = selectNodes(graph, selectedRefs);

  return {
    name: context.name,
    match: {
      status,
      requestedPaths,
      matchedScopes: matchedScopeIds,
      matchedSurfaceTypes,
      sourceLayers: context.layerDirs ?? [],
      reasons: matchReasons(status, requestedPaths, matchedScopeIds),
    },
    identity: identityFromFingerprint(context.fingerprint, context.name),
    selected,
    suggestedReads: buildSuggestedReads(context, selected),
    omissions: buildOmissions(graph, selected),
    generatedCache: context.inventory,
  };
}

function matchReasons(
  status: ContextEntrypoint["match"]["status"],
  requestedPaths: string[],
  matchedScopeIds: string[],
): string[] {
  if (status === "path-match") {
    return [
      requestedPaths.length
        ? `Matched requested path(s): ${requestedPaths.join(", ")}.`
        : "Matched resolved fingerprint context.",
      matchedScopeIds.length
        ? `Matched scope(s): ${matchedScopeIds.join(", ")}.`
        : "Selected directly applicable fingerprint refs.",
      "Expanded selection by one explicit ref hop.",
    ];
  }
  return [
    requestedPaths.length
      ? `No fingerprint scope matched: ${requestedPaths.join(", ")}.`
      : "No target path was supplied.",
    "Using compact global entrypoint; inspect full fingerprint files when the task is broad.",
  ];
}

function identityFromFingerprint(
  fingerprint: GhostFingerprintDocument,
  name: string,
): ContextEntrypoint["identity"] {
  const summary = fingerprint.prose.summary;
  return {
    product: summary.product ?? name,
    audience: summary.audience ?? [],
    goals: summary.goals ?? [],
    antiGoals: summary.anti_goals ?? [],
    tradeoffs: summary.tradeoffs ?? [],
    tone: summary.tone ?? [],
  };
}

function selectNodes(
  graph: FingerprintGraph,
  selectedRefs: Set<NodeRef>,
): ContextEntrypoint["selected"] {
  const selectedNodes = sortNodes(
    graph.nodes.filter((node) => selectedRefs.has(node.ref)),
  );
  return {
    prose: selectedNodes
      .filter((node) =>
        ["situation", "principle", "experience_contract"].includes(node.kind),
      )
      .slice(0, CAPS.prose),
    composition: selectedNodes
      .filter((node) => node.kind === "pattern")
      .slice(0, CAPS.composition),
    exemplars: selectedNodes
      .filter((node) => node.kind === "exemplar")
      .slice(0, CAPS.exemplars),
    checks: selectedNodes
      .filter((node) => node.kind === "check")
      .slice(0, CAPS.checks),
  };
}

function expandOneHop(
  refs: Set<NodeRef>,
  graph: FingerprintGraph,
): Set<NodeRef> {
  const expanded = new Set(refs);
  for (const edge of graph.edges) {
    if (refs.has(edge.from)) expanded.add(edge.to);
    if (refs.has(edge.to)) expanded.add(edge.from);
  }
  return expanded;
}

function buildSuggestedReads(
  context: PackageContext,
  selected: ContextEntrypoint["selected"],
): ContextEntrypoint["suggestedReads"] {
  const reads = new Map<string, string>();
  if (selected.prose.length > 0) {
    reads.set(
      "fingerprint/prose.yml",
      "selected prose anchors and full intent",
    );
  }
  if (selected.composition.length > 0) {
    reads.set(
      "fingerprint/composition.yml",
      "selected composition patterns and neighboring patterns",
    );
  }
  if (selected.exemplars.length > 0) {
    reads.set(
      "fingerprint/inventory.yml",
      "selected exemplars, topology, and building blocks",
    );
  }
  if (selected.checks.length > 0) {
    reads.set(
      "fingerprint/enforcement/checks.yml",
      "active deterministic validation rules",
    );
  }
  for (const exemplar of selected.exemplars) {
    const path = exemplar.appliesTo.paths[0];
    if (path) reads.set(path, `source surface for ${exemplar.ref}`);
  }
  if (context.intent?.trim()) {
    reads.set(
      "fingerprint/memory/intent.md",
      "supplemental human-authored intent",
    );
  }
  if (reads.size === 0) {
    reads.set("fingerprint/prose.yml", "global fingerprint intent");
    reads.set("fingerprint/inventory.yml", "topology and exemplars");
    reads.set("fingerprint/composition.yml", "composition patterns");
  }
  return [...reads.entries()].map(([path, reason]) => ({ path, reason }));
}

function buildOmissions(
  graph: FingerprintGraph,
  selected: ContextEntrypoint["selected"],
): ContextEntrypoint["omissions"] {
  const totals = {
    prose: graph.nodes.filter((node) =>
      ["situation", "principle", "experience_contract"].includes(node.kind),
    ).length,
    composition: graph.nodes.filter((node) => node.kind === "pattern").length,
    exemplars: graph.nodes.filter((node) => node.kind === "exemplar").length,
    checks: graph.nodes.filter((node) => node.kind === "check").length,
  };
  return [
    {
      label: "Prose anchors",
      omitted: Math.max(0, totals.prose - selected.prose.length),
      source: "fingerprint/prose.yml",
    },
    {
      label: "Composition patterns",
      omitted: Math.max(0, totals.composition - selected.composition.length),
      source: "fingerprint/composition.yml",
    },
    {
      label: "Exemplars",
      omitted: Math.max(0, totals.exemplars - selected.exemplars.length),
      source: "fingerprint/inventory.yml",
    },
    {
      label: "Active checks",
      omitted: Math.max(0, totals.checks - selected.checks.length),
      source: "fingerprint/enforcement/checks.yml",
    },
  ];
}
