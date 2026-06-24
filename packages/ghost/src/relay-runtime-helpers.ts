import type { ProjectRelaySourcesResult } from "./context/projection.js";
import type { GhostRelayRequest } from "./context/relay-request.js";
import { GHOST_RELAY_REQUEST_SCHEMA } from "./context/relay-request.js";
import { requestWithPositionalTarget } from "./context/relay-request-input.js";
import type { RelayRequestResolution } from "./context/request-resolution.js";
import type {
  SelectedContext,
  SelectedContextGap,
} from "./context/selected-context.js";
import type { RelayGatherRequestBase, RelayGatherSource } from "./relay.js";

export function relayRequestForRuntime(
  request: GhostRelayRequest | undefined,
  target: string,
  baseKind: RelayGatherRequestBase["kind"],
): GhostRelayRequest | undefined {
  if (request) return requestWithPositionalTarget(request, target);
  if (baseKind !== "none") return undefined;
  return {
    schema: GHOST_RELAY_REQUEST_SCHEMA,
    task: "gather",
    target_paths: target === "." ? [] : [target],
    selectors: {},
  };
}

export function emptySelectedContext(
  name: string,
  targetPaths: string[],
): SelectedContext {
  const product = name || "relay-context";
  return {
    title: `${product} Relay Brief`,
    target_paths: targetPaths,
    stack: [],
    match: {
      status: "global-fallback",
      matched_scopes: [],
      matched_surface_types: [],
      reasons: [
        "No base Ghost fingerprint package was used; Relay resolved declared config context only.",
      ],
    },
    posture: {
      product,
      audience: [],
      goals: [],
      anti_goals: [],
      tradeoffs: [],
      tone: [],
    },
    context_hits: [],
    suggested_reads: [],
    omissions: [],
    gaps: [noBaseFingerprintGap()],
  };
}

export function noBaseFingerprintGap(): SelectedContextGap {
  return {
    kind: "no-base-fingerprint",
    message:
      "No base Ghost fingerprint package was used; Relay resolved request-declared context only.",
  };
}

export function requestSource(
  base: RelayGatherSource,
  resolution: RelayRequestResolution,
  defaults: { root: string; ghostDir: string },
): RelayGatherSource {
  const requestBase =
    base.kind === "request" || base.kind === "request-stack"
      ? base.base
      : ({ kind: "fingerprint" } as const);
  const stackDirs =
    base.kind === "stack" ||
    base.kind === "request" ||
    base.kind === "request-stack"
      ? base.stackDirs
      : base.kind === "package"
        ? [base.packageDir]
        : [];
  const repoRoot =
    base.kind === "stack" ||
    base.kind === "request" ||
    base.kind === "request-stack"
      ? base.repoRoot
      : defaults.root;
  const ghostDir =
    requestBase.kind === "fingerprint"
      ? base.kind === "stack" ||
        base.kind === "request" ||
        base.kind === "request-stack"
        ? (base.ghostDir ?? defaults.ghostDir)
        : defaults.ghostDir
      : undefined;
  const targetPath = base.targetPath;
  if (resolution.matched) {
    return {
      kind: "request-stack",
      repoRoot,
      targetPath,
      base: requestBase,
      ...(ghostDir ? { ghostDir } : {}),
      stackDirs,
      request: resolution.request,
      resolver: {
        id: resolution.matched.resolverId,
        kind: "stack",
      },
      stack: {
        id: resolution.matched.stackId,
        title: resolution.matched.stackTitle,
        path: resolution.matched.stackPath,
        units: resolution.matched.units,
        matched_selectors: resolution.matched.matchedSelectors,
        missing_selectors: resolution.matched.missingSelectors,
        task_context: resolution.matched.taskContext,
      },
    };
  }
  return {
    kind: "request",
    repoRoot,
    targetPath,
    base: requestBase,
    ...(ghostDir ? { ghostDir } : {}),
    stackDirs,
    request: resolution.request,
    reason: requestResolutionReason(resolution),
  };
}

export function requestResolutionReason(
  resolution: RelayRequestResolution,
): "unmatched" | "ambiguous" | "no-resolver" {
  if (
    resolution.gaps.some((gap) =>
      gap.message.includes("declares no request resolvers"),
    )
  ) {
    return "no-resolver";
  }
  if (resolution.gaps.some((gap) => gap.kind === "request-ambiguous")) {
    return "ambiguous";
  }
  return "unmatched";
}

export function mergeProjections(
  base: ProjectRelaySourcesResult,
  extra: ProjectRelaySourcesResult | undefined,
): ProjectRelaySourcesResult {
  if (!extra) return base;
  return {
    contributions: [...base.contributions, ...extra.contributions],
    selected: [...base.selected, ...extra.selected],
    skipped: [...base.skipped, ...extra.skipped],
  };
}
