import {
  type ProjectedContextContribution,
  type ProjectionTraceEntry,
  type ProjectRelaySourcesResult,
  projectRelaySources,
} from "./projection.js";
import type {
  GhostRelaySourceDeclaration,
  GhostRelayStackResolverDeclaration,
  GhostRelayStackUnitSourceDeclaration,
  ResolvedGhostRelayConfig,
} from "./relay-config.js";
import type {
  GhostRelayRequest,
  GhostRelayRequestSelectorValue,
  GhostRelayRequestSummary,
} from "./relay-request.js";
import { summarizeGhostRelayRequest } from "./relay-request.js";
import {
  discoverRelayRequestStackPaths,
  loadRelayRequestStackDocument,
  type RelayRequestStackDocument,
} from "./request-stack-document.js";
import type { SelectedContextGap } from "./selected-context.js";

export interface RelayRequestResolution {
  request: GhostRelayRequestSummary;
  projections: ProjectRelaySourcesResult;
  gaps: SelectedContextGap[];
  matched?: RelayRequestStackMatch;
}

export interface RelayRequestStackMatch {
  resolverId: string;
  stackId: string;
  stackTitle?: string;
  stackPath: string;
  units: string[];
  matchedSelectors: string[];
  missingSelectors: string[];
  taskContext: Record<string, unknown>;
}

interface StackCandidate {
  resolver: GhostRelayStackResolverDeclaration;
  stackPath: string;
  stack: RelayRequestStackDocument;
  score: number;
  directPathMatch: boolean;
  matchedSelectors: string[];
  missingSelectors: string[];
}

const REQUEST_SECTION = "extra:relay_request" as const;
const STACK_SECTION = "extra:resolved_stack" as const;

export async function resolveRelayRequest(
  resolved: ResolvedGhostRelayConfig,
  request: GhostRelayRequest,
  options: { requestedCapabilities: string[] },
): Promise<RelayRequestResolution> {
  const requestSummary = summarizeGhostRelayRequest(request);
  const contributions: ProjectedContextContribution[] = [
    requestContribution(requestSummary),
  ];
  const selected: ProjectionTraceEntry[] = [
    {
      source: "relay-request",
      source_id: "relay-request",
      section: REQUEST_SECTION,
      reason: ["structured Relay request supplied"],
    },
  ];
  const skipped: ProjectionTraceEntry[] = [];
  const gaps: SelectedContextGap[] = [];
  const resolvers = resolved.config.request_resolvers ?? [];

  if (resolvers.length === 0) {
    gaps.push({
      kind: "request-unmatched",
      message:
        "Relay request was supplied, but the Relay config declares no request resolvers.",
    });
    return {
      request: requestSummary,
      projections: { contributions, selected, skipped },
      gaps,
    };
  }

  const candidates = await stackCandidates(resolved, requestSummary, skipped);
  if (candidates.length === 0) {
    gaps.push({
      kind: "request-unmatched",
      message:
        "No declared Relay request resolver matched the request selectors or target paths.",
    });
    return {
      request: requestSummary,
      projections: { contributions, selected, skipped },
      gaps,
    };
  }

  candidates.sort(compareCandidates);
  const [best, second] = candidates;
  if (second && compareCandidateScore(best, second) === 0) {
    gaps.push({
      kind: "request-ambiguous",
      message: `Relay request matched multiple stacks equally: ${best.stackPath}, ${second.stackPath}. Add a more specific selector.`,
    });
    skipped.push(
      ...[best, second].map((candidate) => ({
        source: candidate.stackPath,
        source_id: candidate.resolver.id,
        section: STACK_SECTION,
        reason: ["ambiguous Relay request match"],
      })),
    );
    return {
      request: requestSummary,
      projections: { contributions, selected, skipped },
      gaps,
    };
  }

  contributions.push(stackContribution(best));
  selected.push({
    source: best.stackPath,
    source_id: best.resolver.id,
    section: STACK_SECTION,
    reason: [
      best.directPathMatch
        ? "matched request target path"
        : "matched request selectors",
      ...best.matchedSelectors.map((key) => `selector=${key}`),
    ],
  });
  if (best.missingSelectors.length > 0) {
    gaps.push({
      kind: "request-selector-gap",
      message: `Matched stack does not declare selector(s): ${best.missingSelectors.join(
        ", ",
      )}.`,
    });
  }

  const stackProjections = await projectStackUnitSources(resolved, best, {
    requestedCapabilities: options.requestedCapabilities,
  });
  return {
    request: requestSummary,
    matched: {
      resolverId: best.resolver.id,
      stackId: best.stack.id,
      stackTitle: best.stack.title,
      stackPath: best.stackPath,
      units: best.stack.units,
      matchedSelectors: best.matchedSelectors,
      missingSelectors: best.missingSelectors,
      taskContext: best.stack.task_context ?? {},
    },
    gaps,
    projections: {
      contributions: [...contributions, ...stackProjections.contributions],
      selected: [...selected, ...stackProjections.selected],
      skipped: [...skipped, ...stackProjections.skipped],
    },
  };
}

async function stackCandidates(
  resolved: ResolvedGhostRelayConfig,
  request: GhostRelayRequestSummary,
  skipped: ProjectionTraceEntry[],
): Promise<StackCandidate[]> {
  const candidates: StackCandidate[] = [];
  for (const resolver of resolved.config.request_resolvers ?? []) {
    if (resolver.kind !== "stack") continue;
    const stackPaths = await discoverRelayRequestStackPaths(
      resolved.root,
      resolver,
    );
    if (stackPaths.length === 0) {
      skipped.push({
        source: resolver.path ?? resolver.files?.join(", ") ?? resolver.id,
        source_id: resolver.id,
        section: STACK_SECTION,
        reason: ["stack file not found"],
      });
      continue;
    }
    for (const stackPath of stackPaths) {
      const stack = await loadRelayRequestStackDocument(
        resolved.root,
        stackPath,
        resolver,
      );
      if (!stack.ok) {
        skipped.push({
          source: stackPath,
          source_id: resolver.id,
          section: STACK_SECTION,
          reason: [stack.reason],
        });
        continue;
      }
      const match = matchStack(request, resolver, stackPath, stack.value);
      if (!match.matched) {
        skipped.push({
          source: stackPath,
          source_id: resolver.id,
          section: STACK_SECTION,
          reason: match.reason,
        });
        continue;
      }
      candidates.push({
        resolver,
        stackPath,
        stack: stack.value,
        score: match.score,
        directPathMatch: match.directPathMatch,
        matchedSelectors: match.matchedSelectors,
        missingSelectors: match.missingSelectors,
      });
    }
  }
  return candidates;
}

function matchStack(
  request: GhostRelayRequestSummary,
  resolver: GhostRelayStackResolverDeclaration,
  stackPath: string,
  stack: RelayRequestStackDocument,
): {
  matched: boolean;
  reason: string[];
  score: number;
  directPathMatch: boolean;
  matchedSelectors: string[];
  missingSelectors: string[];
} {
  const directPathMatch = request.target_paths.some(
    (path) =>
      normalizeComparablePath(path) === normalizeComparablePath(stackPath),
  );
  const metadata = selectorMetadata(resolver, stack);
  const matchedSelectors: string[] = [];
  const missingSelectors: string[] = [];
  const conflicts: string[] = [];

  for (const [key, value] of Object.entries(request.selectors)) {
    const candidateValue = metadata[key];
    if (candidateValue === undefined) {
      missingSelectors.push(key);
      continue;
    }
    if (selectorValuesMatch(value, candidateValue)) {
      matchedSelectors.push(key);
    } else {
      conflicts.push(key);
    }
  }

  if (conflicts.length > 0) {
    return {
      matched: false,
      score: 0,
      directPathMatch,
      matchedSelectors,
      missingSelectors,
      reason: [`selector conflict: ${conflicts.join(", ")}`],
    };
  }

  const score = (directPathMatch ? 1000 : 0) + matchedSelectors.length;
  if (score === 0) {
    return {
      matched: false,
      score,
      directPathMatch,
      matchedSelectors,
      missingSelectors,
      reason: ["no selector or target path matched"],
    };
  }

  return {
    matched: true,
    score,
    directPathMatch,
    matchedSelectors,
    missingSelectors,
    reason: [],
  };
}

function selectorMetadata(
  resolver: GhostRelayStackResolverDeclaration,
  stack: RelayRequestStackDocument,
): Record<string, GhostRelayRequestSelectorValue> {
  const metadata: Record<string, GhostRelayRequestSelectorValue> = {};
  if (stack.task_context) {
    for (const [key, value] of Object.entries(stack.task_context)) {
      const selectorValue = selectorValueFromUnknown(value);
      if (selectorValue !== undefined) metadata[key] = selectorValue;
    }
  }
  for (const [key, value] of Object.entries(resolver.match ?? {})) {
    metadata[key] = value;
  }
  return metadata;
}

async function projectStackUnitSources(
  resolved: ResolvedGhostRelayConfig,
  candidate: StackCandidate,
  options: { requestedCapabilities: string[] },
): Promise<ProjectRelaySourcesResult> {
  const sources = candidate.stack.units.flatMap((unit) =>
    candidate.resolver.unit_sources.map((unitSource) =>
      sourceDeclarationForUnit(candidate.resolver, unit, unitSource),
    ),
  );
  if (sources.length === 0) {
    return {
      contributions: [],
      selected: [],
      skipped: [
        {
          source: candidate.stackPath,
          source_id: candidate.resolver.id,
          section: STACK_SECTION,
          reason: ["resolver has no unit_sources"],
        },
      ],
    };
  }
  return projectRelaySources(
    {
      config: {
        schema: resolved.config.schema,
        id: `${resolved.config.id}:${candidate.resolver.id}`,
        profile: resolved.config.profile,
        sources,
      },
      source: "file",
      path: resolved.path,
      root: resolved.root,
    },
    options,
  );
}

function sourceDeclarationForUnit(
  resolver: GhostRelayStackResolverDeclaration,
  unit: string,
  source: GhostRelayStackUnitSourceDeclaration,
): GhostRelaySourceDeclaration {
  const unitId = unit.replaceAll("/", ".").replaceAll("\\", ".");
  const sourceId = source.id ?? source.section.replace("extra:", "extra-");
  return {
    ...source,
    id: `${resolver.id}:${unitId}:${sourceId}`,
    path: source.path
      .replaceAll("{unit}", unit)
      .replaceAll("{unit_id}", unitId),
  };
}

function requestContribution(
  request: GhostRelayRequestSummary,
): ProjectedContextContribution {
  return {
    id: "relay-request",
    section: REQUEST_SECTION,
    source: "relay-request",
    source_id: "relay-request",
    summary: `Relay request for ${request.task}.`,
    content: {
      task: request.task,
      target_paths: request.target_paths,
      selectors: request.selectors,
      ...(request.constraints ? { constraints: request.constraints } : {}),
      ...(request.prompt ? { prompt: request.prompt } : {}),
    },
    visibility: "public",
    priority: 1000,
  };
}

function stackContribution(
  candidate: StackCandidate,
): ProjectedContextContribution {
  return {
    id: candidate.stack.id,
    section: STACK_SECTION,
    source: candidate.stackPath,
    source_id: candidate.resolver.id,
    summary:
      candidate.stack.title ??
      candidate.stack.purpose ??
      `Resolved stack ${candidate.stack.id}.`,
    content: {
      resolver_id: candidate.resolver.id,
      stack_id: candidate.stack.id,
      stack_path: candidate.stackPath,
      units: candidate.stack.units,
      task_context: candidate.stack.task_context ?? {},
      matched_selectors: candidate.matchedSelectors,
      missing_selectors: candidate.missingSelectors,
    },
    visibility: "public",
    priority: 900,
  };
}

function compareCandidates(a: StackCandidate, b: StackCandidate): number {
  const score = compareCandidateScore(a, b);
  if (score !== 0) return score;
  return a.stackPath.localeCompare(b.stackPath);
}

function compareCandidateScore(a: StackCandidate, b: StackCandidate): number {
  if (a.score !== b.score) return b.score - a.score;
  return b.matchedSelectors.length - a.matchedSelectors.length;
}

function selectorValuesMatch(
  requested: GhostRelayRequestSelectorValue,
  candidate: GhostRelayRequestSelectorValue,
): boolean {
  const requestedAliases = valuesForCompare(requested);
  const candidateAliases = valuesForCompare(candidate);
  return requestedAliases.some((requestedValue) =>
    candidateAliases.some(
      (candidateValue) =>
        candidateValue === requestedValue ||
        candidateValue.endsWith(`-${requestedValue}`) ||
        requestedValue.endsWith(`-${candidateValue}`),
    ),
  );
}

function valuesForCompare(value: GhostRelayRequestSelectorValue): string[] {
  return (Array.isArray(value) ? value : [value]).flatMap(selectorAliases);
}

function selectorAliases(value: string): string[] {
  const normalized = normalizeSelector(value);
  const parts = value.split(/[/.]/).filter(Boolean);
  const last = parts.at(-1);
  return [
    normalized,
    ...(last && last !== value ? [normalizeSelector(last)] : []),
  ].filter((item, index, items) => item && items.indexOf(item) === index);
}

function normalizeSelector(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[/_.\s]+/g, "-")
    .replace(/[^a-z0-9-]+/g, "")
    .replace(/^-+|-+$/g, "");
}

function selectorValueFromUnknown(
  value: unknown,
): GhostRelayRequestSelectorValue | undefined {
  if (isNonEmptyString(value)) return value;
  if (Array.isArray(value)) {
    const values = value.filter(isNonEmptyString);
    return values.length ? values : undefined;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return undefined;
}

function normalizeComparablePath(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\.\//, "");
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
