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
import type { PackageContext } from "./package-context.js";

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
  actionContract: {
    preserve: string[];
    inspect: Array<{ path: string; reason: string }>;
    avoid: string[];
    validate: string[];
  };
  selected: {
    prose: FingerprintGraphNode[];
    composition: FingerprintGraphNode[];
    exemplars: FingerprintGraphNode[];
    checks: FingerprintGraphNode[];
  };
  suggestedReads: Array<{ path: string; reason: string }>;
  omissions: Array<{ label: string; omitted: number; source: string }>;
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
const ACTION_CONTRACT_CAP = 5;

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
  const selected = selectNodes(graph, selectedRefs, {
    directRefs,
    matchedScopeIds,
    matchedSurfaceTypes,
    requestedPaths,
    useRelevance: status === "path-match",
  });
  const identity = identityFromFingerprint(context.fingerprint, context.name);
  const suggestedReads = buildSuggestedReads(context, selected);

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
    identity,
    actionContract: buildActionContract(identity, selected, suggestedReads),
    selected,
    suggestedReads,
    omissions: buildOmissions(graph, selected),
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
  ranking: SelectionRanking,
): ContextEntrypoint["selected"] {
  const selectedNodes = sortSelectedNodes(
    graph,
    graph.nodes.filter((node) => selectedRefs.has(node.ref)),
    ranking,
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

interface SelectionRanking {
  directRefs: Set<NodeRef>;
  matchedScopeIds: string[];
  matchedSurfaceTypes: string[];
  requestedPaths: string[];
  useRelevance: boolean;
}

function sortSelectedNodes(
  graph: FingerprintGraph,
  nodes: FingerprintGraphNode[],
  ranking: SelectionRanking,
): FingerprintGraphNode[] {
  const sorted = sortNodes(nodes);
  if (!ranking.useRelevance) return sorted;
  return sorted.sort(
    (a, b) =>
      relevanceScore(b, graph, ranking) - relevanceScore(a, graph, ranking) ||
      a.order - b.order,
  );
}

function relevanceScore(
  node: FingerprintGraphNode,
  graph: FingerprintGraph,
  ranking: SelectionRanking,
): number {
  let score = 0;
  if (nodeMatchesTargets(node, ranking.requestedPaths)) score += 100;
  if (intersects(node.appliesTo.scopes, ranking.matchedScopeIds)) score += 50;
  if (intersects(node.appliesTo.surfaceTypes, ranking.matchedSurfaceTypes)) {
    score += 20;
  }
  if (isConnectedToDirectRef(node.ref, graph, ranking.directRefs)) score += 10;
  return score;
}

function isConnectedToDirectRef(
  ref: NodeRef,
  graph: FingerprintGraph,
  directRefs: Set<NodeRef>,
): boolean {
  return graph.edges.some(
    (edge) =>
      (edge.from === ref && directRefs.has(edge.to)) ||
      (edge.to === ref && directRefs.has(edge.from)),
  );
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
  _context: PackageContext,
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
      "fingerprint/checks.yml",
      "active deterministic validation rules",
    );
  }
  for (const exemplar of selected.exemplars) {
    const path = exemplar.appliesTo.paths[0];
    if (path) reads.set(path, `source surface for ${exemplar.ref}`);
  }
  if (reads.size === 0) {
    reads.set("fingerprint/prose.yml", "global fingerprint intent");
    reads.set("fingerprint/inventory.yml", "topology and exemplars");
    reads.set("fingerprint/composition.yml", "composition patterns");
  }
  return [...reads.entries()].map(([path, reason]) => ({ path, reason }));
}

function buildActionContract(
  identity: ContextEntrypoint["identity"],
  selected: ContextEntrypoint["selected"],
  suggestedReads: ContextEntrypoint["suggestedReads"],
): ContextEntrypoint["actionContract"] {
  const prose = sortNodes(selected.prose);
  const composition = sortNodes(selected.composition);
  const preserve = uniqueCapped([
    ...prose.map((node) => node.summary),
    ...composition.map((node) => node.summary),
    ...prose.flatMap((node) =>
      node.details.filter((detail) => !isAvoidanceDetail(detail)),
    ),
  ]);
  const inspect = uniqueInspectReads([
    ...selected.exemplars
      .map((exemplar) => {
        const path = exemplar.appliesTo.paths[0];
        return path
          ? { path, reason: `source surface for ${exemplar.ref}` }
          : undefined;
      })
      .filter((read): read is { path: string; reason: string } =>
        Boolean(read),
      ),
    ...suggestedReads,
  ]);
  const avoid = uniqueCapped([
    ...identity.antiGoals,
    ...prose.flatMap((node) => node.details.filter(isAvoidanceDetail)),
    ...composition.flatMap((node) => node.details.filter(isAvoidanceDetail)),
  ]);
  const validate =
    selected.checks.length > 0
      ? uniqueCapped(
          selected.checks.map((node) => `${node.ref} - ${node.summary}`),
        )
      : [
          "No selected active checks. Proposed or disabled checks are not blocking validation.",
        ];

  return { preserve, inspect, avoid, validate };
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
      source: "fingerprint/checks.yml",
    },
  ];
}

function uniqueCapped(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const normalized = value.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
    if (out.length >= ACTION_CONTRACT_CAP) break;
  }
  return out;
}

function uniqueInspectReads(
  reads: Array<{ path: string; reason: string }>,
): Array<{ path: string; reason: string }> {
  const seen = new Set<string>();
  const out: Array<{ path: string; reason: string }> = [];
  for (const read of reads) {
    const path = read.path.trim();
    if (!path || seen.has(path)) continue;
    seen.add(path);
    out.push({ path, reason: read.reason });
    if (out.length >= ACTION_CONTRACT_CAP) break;
  }
  return out;
}

function isAvoidanceDetail(detail: string): boolean {
  return /^(Refuses|Counterexample|Avoid):/.test(detail);
}
