import { buildContextEntrypoint } from "./context/entrypoint.js";
import {
  loadPackageContext,
  type PackageContext,
} from "./context/package-context.js";
import {
  type ProjectRelaySourcesResult,
  projectRelaySources,
} from "./context/projection.js";
import type { ResolvedGhostRelayConfig } from "./context/relay-config.js";
import { relayConfigBase } from "./context/relay-config.js";
import { loadGhostRelayConfig } from "./context/relay-config-loader.js";
import {
  buildGhostRelayContext,
  type GhostRelayContext,
} from "./context/relay-context.js";
import {
  type GhostRelayMode,
  resolveRequestedCapabilities,
} from "./context/relay-modes.js";
import type {
  GhostRelayRequest,
  GhostRelayRequestSummary,
} from "./context/relay-request.js";
import {
  type RelayRequestResolution,
  resolveRelayRequest,
} from "./context/request-resolution.js";
import {
  buildSelectedContext,
  formatSelectedContextMarkdown,
  type SelectedContext,
} from "./context/selected-context.js";
import { resolveFingerprintPackage } from "./fingerprint.js";
import {
  emptySelectedContext,
  mergeProjections,
  relayRequestForRuntime,
  requestResolutionReason,
  requestSource,
} from "./relay-runtime-helpers.js";
import {
  fingerprintStackToPackageContext,
  type GhostFingerprintStack,
  loadFingerprintStackForPath,
  resolveGhostDirDefault,
  resolveGitRoot,
} from "./scan/fingerprint-stack.js";

export type {
  GhostContextSection,
  GhostCoreSection,
  GhostExtraSection,
  GhostRelayBaseDeclaration,
  GhostRelayConfig,
  GhostRelayRequestResolverDeclaration,
  GhostRelaySourceDeclaration,
  GhostRelayStackResolverDeclaration,
  GhostRelayStackUnitSourceDeclaration,
} from "./context/relay-config.js";
export { GHOST_RELAY_CONFIG_SCHEMA } from "./context/relay-config.js";
export type {
  GhostRelayContext,
  GhostRelayContextItem,
  GhostRelayContextSource,
  GhostRelayContextTraceEntry,
} from "./context/relay-context.js";
export { GHOST_RELAY_CONTEXT_SCHEMA } from "./context/relay-context.js";
export type { GhostRelayMode } from "./context/relay-modes.js";
export { RELAY_MODES } from "./context/relay-modes.js";
export type {
  GhostRelayRequest,
  GhostRelayRequestSelectorValue,
  GhostRelayRequestSummary,
} from "./context/relay-request.js";
export {
  GHOST_RELAY_REQUEST_SCHEMA,
  parseGhostRelayRequest,
  parseGhostRelayRequestRaw,
  summarizeGhostRelayRequest,
  validateGhostRelayRequest,
} from "./context/relay-request.js";
export type {
  SelectedContext,
  SelectedContextGap,
  SelectedContextHit,
  SelectedContextOmission,
  SelectedContextPackage,
  SelectedContextPosture,
  SelectedContextRead,
} from "./context/selected-context.js";
export { registerRelayCommand } from "./relay-command.js";

export const RELAY_GATHER_SCHEMA = "ghost.relay.gather/v2" as const;

export interface GatherRelayContextOptions {
  cwd?: string;
  target?: string;
  packageDir?: string;
  ghostDir?: string;
  name?: string;
  config?: string;
  mode?: GhostRelayMode;
  request?: GhostRelayRequest;
}

export type RelayGatherSource =
  | {
      kind: "stack";
      repoRoot: string;
      targetPath: string;
      ghostDir: string;
      stackDirs: string[];
      provenance: {
        merge: "child-wins-by-id";
        stack: GhostFingerprintStack["provenance"]["layers"];
      };
    }
  | {
      kind: "package";
      packageDir: string;
      targetPath: string | null;
    }
  | {
      kind: "request";
      repoRoot: string;
      targetPath: string | null;
      base: RelayGatherRequestBase;
      ghostDir?: string;
      stackDirs: string[];
      request: GhostRelayRequestSummary;
      reason: "unmatched" | "ambiguous" | "no-resolver";
    }
  | {
      kind: "request-stack";
      repoRoot: string;
      targetPath: string | null;
      base: RelayGatherRequestBase;
      ghostDir?: string;
      stackDirs: string[];
      request: GhostRelayRequestSummary;
      resolver: {
        id: string;
        kind: "stack";
      };
      stack: {
        id: string;
        title?: string;
        path: string;
        units: string[];
        matched_selectors: string[];
        missing_selectors: string[];
        task_context: Record<string, unknown>;
      };
    };

export type RelayGatherRequestBase = { kind: "fingerprint" } | { kind: "none" };

export interface RelayGatherResult {
  schema: typeof RELAY_GATHER_SCHEMA;
  name: string;
  source: RelayGatherSource;
  targetPaths: string[];
  ghostDir?: string;
  stackDirs: string[];
  selected_context: SelectedContext;
  context: GhostRelayContext;
  brief: string;
}

export async function gatherRelayContext(
  options: GatherRelayContextOptions = {},
): Promise<RelayGatherResult> {
  const cwd = options.cwd ?? process.cwd();
  const target = options.target ?? ".";
  const ghostDir = resolveGhostDirDefault(options.ghostDir);
  const root = await resolveGitRoot(cwd);
  const initialConfig = await loadGhostRelayConfig({
    cwd,
    root,
    explicitPath: options.config,
    ghostDir,
  });
  const base = relayConfigBase(initialConfig.config);
  const request = relayRequestForRuntime(options.request, target, base.kind);

  if (base.kind === "none" && !options.packageDir) {
    if (!request) {
      throw new Error("base.kind none requires a Relay request.");
    }
    return gatherWithoutFingerprintBase({
      config: initialConfig,
      cwd,
      ghostDir,
      mode: options.mode,
      name: options.name,
      request,
      root,
      target,
    });
  }

  if (options.packageDir) {
    const context = await loadPackageContext(
      resolveFingerprintPackage(options.packageDir, cwd),
      options.name,
    );
    const targetPaths = target === "." ? [] : [target];
    context.targetPaths = targetPaths;
    if (request) {
      return gatherRequestFromContext(context, {
        cwd,
        source: {
          kind: "package",
          packageDir: context.packageDir ?? options.packageDir,
          targetPath: targetPaths[0] ?? null,
        },
        targetPaths,
        root: cwd,
        ghostDir,
        configPath: options.config,
        mode: options.mode,
        request,
      });
    }
    return gatherFromContext(context, {
      cwd,
      source: {
        kind: "package",
        packageDir: context.packageDir ?? options.packageDir,
        targetPath: targetPaths[0] ?? null,
      },
      targetPaths,
      root: cwd,
      ghostDir,
      configPath: options.config,
      mode: options.mode,
    });
  }

  const stackTarget = request?.target_paths?.[0] ?? target;
  const stack = await loadFingerprintStackForPath(stackTarget, cwd, {
    ghostDir,
  });
  const requestTargetPaths = request ? (request.target_paths ?? []) : undefined;
  const context = fingerprintStackToPackageContext(
    stack,
    options.name,
    requestTargetPaths ?? [stack.target_path],
  );
  if (request) {
    return gatherRequestFromContext(context, {
      cwd,
      source: {
        kind: "stack",
        repoRoot: stack.repo_root,
        targetPath: stack.target_path,
        ghostDir: stack.ghost_dir,
        stackDirs: stack.layers.map((layer) => layer.dir),
        provenance: {
          merge: stack.provenance.merge,
          stack: stack.provenance.layers,
        },
      },
      targetPaths: context.targetPaths ?? [],
      root: stack.repo_root,
      ghostDir: stack.ghost_dir,
      configPath: options.config,
      mode: options.mode,
      request,
    });
  }
  return gatherFromContext(context, {
    cwd,
    source: {
      kind: "stack",
      repoRoot: stack.repo_root,
      targetPath: stack.target_path,
      ghostDir: stack.ghost_dir,
      stackDirs: stack.layers.map((layer) => layer.dir),
      provenance: {
        merge: stack.provenance.merge,
        stack: stack.provenance.layers,
      },
    },
    targetPaths: context.targetPaths ?? [stack.target_path],
    root: stack.repo_root,
    ghostDir: stack.ghost_dir,
    configPath: options.config,
    mode: options.mode,
  });
}

export function formatRelayBrief(
  result: Pick<RelayGatherResult, "selected_context">,
): string {
  return formatSelectedContextMarkdown(result.selected_context);
}

async function gatherWithoutFingerprintBase(options: {
  config: ResolvedGhostRelayConfig;
  cwd: string;
  ghostDir: string;
  mode?: GhostRelayMode;
  name?: string;
  request: GhostRelayRequest;
  root: string;
  target: string;
}): Promise<RelayGatherResult> {
  const mode = options.mode ?? "generation";
  const requestedCapabilities = resolveRequestedCapabilities({ mode });
  const targetPaths = options.request.target_paths ?? [];
  const selectedContext = emptySelectedContext(
    options.name ?? options.config.config.id,
    targetPaths,
  );
  const projections = await projectRelaySources(options.config, {
    requestedCapabilities,
  });
  const requestResolution = await resolveRelayRequest(
    options.config,
    options.request,
    { requestedCapabilities },
  );
  const source = requestSource(
    {
      kind: "request",
      repoRoot: options.root,
      targetPath: targetPaths[0] ?? null,
      base: { kind: "none" },
      stackDirs: [],
      request: requestResolution.request,
      reason: requestResolutionReason(requestResolution),
    },
    requestResolution,
    {
      root: options.root,
      ghostDir: options.ghostDir,
    },
  );
  const relayContext = buildGhostRelayContext(selectedContext, {
    mode,
    config: options.config,
    projections: mergeProjections(projections, requestResolution.projections),
    request: requestResolution.request,
    extraGaps: requestResolution.gaps,
  });
  const partial = { selected_context: selectedContext };
  return {
    schema: RELAY_GATHER_SCHEMA,
    name: selectedContext.title.replace(/ Relay Brief$/, ""),
    source,
    targetPaths,
    stackDirs: [],
    selected_context: selectedContext,
    context: relayContext,
    brief: formatRelayBrief(partial),
  };
}

async function gatherFromContext(
  context: PackageContext,
  options: {
    cwd: string;
    source: RelayGatherSource;
    targetPaths: string[];
    root: string;
    ghostDir: string;
    configPath?: string;
    mode?: GhostRelayMode;
    config?: Awaited<ReturnType<typeof loadGhostRelayConfig>>;
    extraProjections?: ProjectRelaySourcesResult;
    request?: GhostRelayRequestSummary;
    requestGaps?: RelayRequestResolution["gaps"];
  },
): Promise<RelayGatherResult> {
  const mode = options.mode ?? "generation";
  const requestedCapabilities = resolveRequestedCapabilities({
    mode,
  });
  const entrypoint = buildContextEntrypoint(context, {
    targetPaths: options.targetPaths,
  });
  const selectedContext = buildSelectedContext(context, entrypoint);
  const config =
    options.config ??
    (await loadGhostRelayConfig({
      cwd: options.cwd,
      root: options.root,
      explicitPath: options.configPath,
      ghostDir: options.ghostDir,
      packageDir: context.packageDir,
    }));
  const projections = await projectRelaySources(config, {
    requestedCapabilities,
  });
  const mergedProjections = mergeProjections(
    projections,
    options.extraProjections,
  );
  const relayContext = buildGhostRelayContext(selectedContext, {
    mode,
    config,
    projections: mergedProjections,
    request: options.request,
    extraGaps: options.requestGaps,
  });
  const partial = { selected_context: selectedContext };
  const stackDirs = context.stackDirs?.length
    ? context.stackDirs
    : context.packageDir
      ? [context.packageDir]
      : [];
  return {
    schema: RELAY_GATHER_SCHEMA,
    name: context.name,
    source: options.source,
    targetPaths: entrypoint.match.requestedPaths,
    ghostDir:
      options.source.kind === "stack" ||
      options.source.kind === "request" ||
      options.source.kind === "request-stack"
        ? options.source.ghostDir
        : undefined,
    stackDirs,
    selected_context: selectedContext,
    context: relayContext,
    brief: formatRelayBrief(partial),
  };
}

async function gatherRequestFromContext(
  context: PackageContext,
  options: {
    cwd: string;
    source: RelayGatherSource;
    targetPaths: string[];
    root: string;
    ghostDir: string;
    configPath?: string;
    mode?: GhostRelayMode;
    request: GhostRelayRequest;
  },
): Promise<RelayGatherResult> {
  const mode = options.mode ?? "generation";
  const requestedCapabilities = resolveRequestedCapabilities({ mode });
  const config = await loadGhostRelayConfig({
    cwd: options.cwd,
    root: options.root,
    explicitPath: options.configPath,
    ghostDir: options.ghostDir,
    packageDir: context.packageDir,
  });
  const requestResolution = await resolveRelayRequest(config, options.request, {
    requestedCapabilities,
  });
  return gatherFromContext(context, {
    ...options,
    source: requestSource(options.source, requestResolution, {
      root: options.root,
      ghostDir: options.ghostDir,
    }),
    mode,
    config,
    extraProjections: requestResolution.projections,
    request: requestResolution.request,
    requestGaps: requestResolution.gaps,
  });
}
