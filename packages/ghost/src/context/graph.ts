import type {
  GhostCheck,
  GhostFingerprintDocument,
  GhostFingerprintRef,
} from "#ghost-core";
import type { PackageContext } from "./package-context.js";

export type NodeKind =
  | "situation"
  | "principle"
  | "experience_contract"
  | "pattern"
  | "exemplar"
  | "check";

export type NodeRef = GhostFingerprintRef;

export interface Applicability {
  paths: string[];
  scopes: string[];
  surfaceTypes: string[];
}

export interface FingerprintGraphNode {
  ref: NodeRef;
  id: string;
  kind: NodeKind;
  label: string;
  summary: string;
  details: string[];
  sourceFile: string;
  order: number;
  appliesTo: Applicability;
}

export interface FingerprintGraphEdge {
  from: NodeRef;
  to: NodeRef;
  reason: string;
}

export interface FingerprintGraphScope {
  id: string;
  paths: string[];
  surfaceTypes: string[];
}

export interface FingerprintGraph {
  nodes: FingerprintGraphNode[];
  edges: FingerprintGraphEdge[];
  scopes: FingerprintGraphScope[];
  nodeByRef: Map<NodeRef, FingerprintGraphNode>;
}

const KIND_ORDER: Record<NodeKind, number> = {
  situation: 0,
  principle: 1,
  experience_contract: 2,
  pattern: 3,
  exemplar: 4,
  check: 5,
};

export function buildFingerprintGraph(
  context: PackageContext,
): FingerprintGraph {
  const nodes: FingerprintGraphNode[] = [];
  const pendingEdges: FingerprintGraphEdge[] = [];
  let order = 0;

  const addNode = (
    node: Omit<FingerprintGraphNode, "order" | "appliesTo"> & {
      appliesTo?: Partial<Applicability>;
    },
  ) => {
    nodes.push({
      ...node,
      order: order++,
      appliesTo: normalizeApplicability(node.appliesTo),
    });
  };

  const fingerprint = context.fingerprint;
  for (const situation of fingerprint.intent.situations) {
    const ref = refFor("intent.situation", situation.id);
    addNode({
      ref,
      id: situation.id,
      kind: "situation",
      label: situation.title ?? situation.id,
      summary:
        situation.product_obligation ??
        situation.user_intent ??
        situation.surface_type ??
        "Recorded situation.",
      details: [
        situation.user_intent ? `User intent: ${situation.user_intent}` : "",
        situation.product_obligation
          ? `Product obligation: ${situation.product_obligation}`
          : "",
        ...(situation.refuses ?? []).map((entry) => `Refuses: ${entry}`),
      ].filter(Boolean),
      sourceFile: "intent.yml",
      appliesTo: {
        surfaceTypes: situation.surface_type ? [situation.surface_type] : [],
        paths: evidencePaths(situation.evidence),
      },
    });
    addRefEdges(ref, situation.principles, "situation principle");
    addRefEdges(
      ref,
      situation.experience_contracts,
      "situation experience contract",
    );
    addRefEdges(ref, situation.patterns, "situation composition pattern");
  }

  for (const principle of fingerprint.intent.principles) {
    const ref = refFor("intent.principle", principle.id);
    addNode({
      ref,
      id: principle.id,
      kind: "principle",
      label: principle.id,
      summary: principle.principle,
      details: [
        ...(principle.guidance ?? []),
        ...(principle.counterexamples ?? []).map(
          (entry) => `Counterexample: ${entry}`,
        ),
      ],
      sourceFile: "intent.yml",
      appliesTo: applicabilityFromScope(principle.applies_to),
    });
    addRefEdges(ref, principle.check_refs, "principle check");
  }

  for (const contract of fingerprint.intent.experience_contracts) {
    const ref = refFor("intent.experience_contract", contract.id);
    addNode({
      ref,
      id: contract.id,
      kind: "experience_contract",
      label: contract.id,
      summary: contract.contract,
      details: contract.obligations ?? [],
      sourceFile: "intent.yml",
      appliesTo: applicabilityFromScope(contract.applies_to),
    });
    addRefEdges(ref, contract.check_refs, "experience contract check");
  }

  for (const pattern of fingerprint.composition.patterns) {
    const ref = refFor("composition.pattern", pattern.id);
    addNode({
      ref,
      id: pattern.id,
      kind: "pattern",
      label: `${pattern.id} (${pattern.kind})`,
      summary: pattern.pattern,
      details: [
        ...(pattern.guidance ?? []),
        ...(pattern.anti_patterns?.length
          ? [`Avoid: ${pattern.anti_patterns.join("; ")}`]
          : []),
      ],
      sourceFile: "composition.yml",
      appliesTo: applicabilityFromScope(pattern.applies_to),
    });
    addRefEdges(ref, pattern.check_refs, "composition check");
  }

  for (const exemplar of fingerprint.inventory.exemplars) {
    const ref = refFor("inventory.exemplar", exemplar.id);
    addNode({
      ref,
      id: exemplar.id,
      kind: "exemplar",
      label: exemplar.title ?? exemplar.id,
      summary: exemplar.why ?? exemplar.note ?? exemplar.path,
      details: [
        `Path: ${exemplar.path}`,
        exemplar.surface_type ? `Surface type: ${exemplar.surface_type}` : "",
        exemplar.scope ? `Scope: ${exemplar.scope}` : "",
      ].filter(Boolean),
      sourceFile: "inventory.yml",
      appliesTo: {
        paths: [exemplar.path],
        scopes: exemplar.scope ? [exemplar.scope] : [],
        surfaceTypes: exemplar.surface_type ? [exemplar.surface_type] : [],
      },
    });
    addRefEdges(ref, exemplar.refs, "exemplar ref");
  }

  for (const check of activeChecks(context)) {
    const ref = refFor("validate.check", check.id);
    addNode({
      ref,
      id: check.id,
      kind: "check",
      label: check.title,
      summary: `${check.severity}: ${check.title}`,
      details: [
        check.repair ? `Repair: ${check.repair}` : "",
        detectorSummary(check),
      ].filter(Boolean),
      sourceFile: "validate.yml",
      appliesTo: applicabilityFromCheck(check),
    });
    addRefEdges(ref, check.derivation?.intent, "check intent derivation");
    addRefEdges(ref, check.derivation?.inventory, "check inventory derivation");
    addRefEdges(
      ref,
      check.derivation?.composition,
      "check composition derivation",
    );
  }

  const nodeByRef = new Map(nodes.map((node) => [node.ref, node]));
  const edges = pendingEdges.filter(
    (edge) => nodeByRef.has(edge.from) && nodeByRef.has(edge.to),
  );

  return {
    nodes,
    edges,
    scopes: buildScopes(fingerprint),
    nodeByRef,
  };

  function addRefEdges(
    from: NodeRef,
    refs: readonly GhostFingerprintRef[] | undefined,
    reason: string,
  ) {
    for (const to of refs ?? []) {
      pendingEdges.push({ from, to, reason });
    }
  }
}

export function matchScopes(
  scopes: FingerprintGraphScope[],
  targetPaths: string[],
): FingerprintGraphScope[] {
  if (targetPaths.length === 0) return [];
  return scopes.filter((scope) =>
    scope.paths.some((scopePath) =>
      targetPaths.some((targetPath) => pathsOverlap(scopePath, targetPath)),
    ),
  );
}

export function nodeMatchesTargets(
  node: FingerprintGraphNode,
  targetPaths: string[],
): boolean {
  return (
    targetPaths.length > 0 &&
    node.appliesTo.paths.some((nodePath) =>
      targetPaths.some((targetPath) => pathsOverlap(nodePath, targetPath)),
    )
  );
}

export function normalizeTargetPaths(paths: string[]): string[] {
  return unique(
    paths
      .map(normalizePath)
      .filter((path) => path && path !== "." && path !== "/"),
  );
}

export function sortNodes(
  nodes: FingerprintGraphNode[],
): FingerprintGraphNode[] {
  return [...nodes].sort(
    (a, b) =>
      KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
      a.order - b.order ||
      a.ref.localeCompare(b.ref),
  );
}

export function intersects(a: string[], b: string[]): boolean {
  if (a.length === 0 || b.length === 0) return false;
  const values = new Set(a);
  return b.some((value) => values.has(value));
}

export function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

export function pathsOverlap(a: string, b: string): boolean {
  const left = normalizePath(a);
  const right = normalizePath(b);
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.endsWith("*")) return right.startsWith(left.slice(0, -1));
  if (right.endsWith("*")) return left.startsWith(right.slice(0, -1));
  return left.startsWith(`${right}/`) || right.startsWith(`${left}/`);
}

function buildScopes(
  fingerprint: GhostFingerprintDocument,
): FingerprintGraphScope[] {
  return (fingerprint.inventory.topology.scopes ?? []).map((scope) => ({
    id: scope.id,
    paths: scope.paths.map(normalizePath),
    surfaceTypes: scope.surface_types ?? [],
  }));
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/+$/g, "");
}

function normalizeApplicability(
  value: Partial<Applicability> | undefined,
): Applicability {
  return {
    paths: unique((value?.paths ?? []).map(normalizePath).filter(Boolean)),
    scopes: unique(value?.scopes ?? []),
    surfaceTypes: unique(value?.surfaceTypes ?? []),
  };
}

function applicabilityFromScope(
  scope:
    | {
        paths?: string[];
        scopes?: string[];
        surface_types?: string[];
      }
    | undefined,
): Partial<Applicability> {
  return {
    paths: scope?.paths ?? [],
    scopes: scope?.scopes ?? [],
    surfaceTypes: scope?.surface_types ?? [],
  };
}

function applicabilityFromCheck(check: GhostCheck): Partial<Applicability> {
  return {
    paths: check.applies_to?.paths ?? [],
    scopes: check.applies_to?.scopes ?? [],
    surfaceTypes: check.applies_to?.surface_types ?? [],
  };
}

function evidencePaths(
  evidence: Array<{ path?: string }> | undefined,
): string[] {
  return (evidence ?? [])
    .map((entry) => entry.path)
    .filter((path): path is string => Boolean(path));
}

function activeChecks(context: PackageContext): GhostCheck[] {
  return (
    context.checks?.checks.filter((check) => check.status === "active") ?? []
  );
}

function detectorSummary(check: GhostCheck): string {
  const detector = check.detector;
  return detector.pattern
    ? `${detector.type}: ${detector.pattern}`
    : detector.value
      ? `${detector.type}: ${detector.value}`
      : detector.type;
}

function refFor(prefix: string, id: string): NodeRef {
  return `${prefix}:${id}` as NodeRef;
}
