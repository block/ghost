import type { CAC } from "cac";
import { buildContextEntrypoint } from "./context/entrypoint.js";
import {
  loadPackageContext,
  type PackageContext,
} from "./context/package-context.js";
import { projectRelaySources } from "./context/projection.js";
import { loadGhostRelayConfig } from "./context/relay-config-loader.js";
import {
  buildGhostRelayContext,
  type GhostRelayContext,
} from "./context/relay-context.js";
import {
  type GhostRelayMode,
  isRelayMode,
  resolveRequestedCapabilities,
} from "./context/relay-modes.js";
import {
  buildSelectedContext,
  formatSelectedContextMarkdown,
  type SelectedContext,
} from "./context/selected-context.js";
import { resolveFingerprintPackage } from "./fingerprint.js";
import {
  fingerprintStackToPackageContext,
  type GhostFingerprintStack,
  loadFingerprintStackForPath,
  resolveGhostDirDefault,
} from "./scan/fingerprint-stack.js";

export type {
  GhostContextSection,
  GhostCoreSection,
  GhostExtraSection,
  GhostRelayConfig,
  GhostRelaySourceDeclaration,
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
  SelectedContext,
  SelectedContextGap,
  SelectedContextHit,
  SelectedContextOmission,
  SelectedContextPackage,
  SelectedContextPosture,
  SelectedContextRead,
} from "./context/selected-context.js";

export const RELAY_GATHER_SCHEMA = "ghost.relay.gather/v2" as const;

export interface GatherRelayContextOptions {
  cwd?: string;
  target?: string;
  packageDir?: string;
  ghostDir?: string;
  name?: string;
  config?: string;
  mode?: GhostRelayMode;
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
    };

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

  if (options.packageDir) {
    const context = await loadPackageContext(
      resolveFingerprintPackage(options.packageDir, cwd),
      options.name,
    );
    const targetPaths = target === "." ? [] : [target];
    context.targetPaths = targetPaths;
    return gatherFromContext(context, {
      cwd,
      source: {
        kind: "package",
        packageDir: context.packageDir ?? options.packageDir,
        targetPath: targetPaths[0] ?? null,
      },
      targetPaths,
      root: cwd,
      ghostDir: resolveGhostDirDefault(options.ghostDir),
      configPath: options.config,
      mode: options.mode,
    });
  }

  const ghostDir = resolveGhostDirDefault(options.ghostDir);
  const stack = await loadFingerprintStackForPath(target, cwd, { ghostDir });
  const context = fingerprintStackToPackageContext(stack, options.name);
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

export function registerRelayCommand(cli: CAC): void {
  cli
    .command(
      "relay <action> [target]",
      "Gather fingerprint-grounded context for an agent target.",
    )
    .option(
      "--package <dir>",
      "Use exactly this fingerprint package directory instead of resolving a stack",
    )
    .option(
      "--name <name>",
      "Override the gathered context name (default: intent.yml product or resolved scope)",
    )
    .option("--format <fmt>", "Output format: markdown or json", {
      default: "markdown",
    })
    .option("--config <file>", "Load an explicit Ghost Relay config")
    .option("--mode <mode>", "Relay mode: generation, review, or prompt", {
      default: "generation",
    })
    .action(async (action: string, target: string | undefined, opts) => {
      try {
        if (action !== "gather") {
          console.error("Error: unknown relay action. Supported: gather");
          process.exit(2);
          return;
        }
        if (opts.format !== "markdown" && opts.format !== "json") {
          console.error("Error: --format must be 'markdown' or 'json'");
          process.exit(2);
          return;
        }
        if (typeof opts.mode !== "string" || !isRelayMode(opts.mode)) {
          console.error("Error: --mode must be generation, review, or prompt");
          process.exit(2);
          return;
        }

        const result = await gatherRelayContext({
          target: target ?? ".",
          packageDir:
            typeof opts.package === "string" ? opts.package : undefined,
          name: typeof opts.name === "string" ? opts.name : undefined,
          config: typeof opts.config === "string" ? opts.config : undefined,
          mode: opts.mode,
        });

        if (opts.format === "json") {
          process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        } else {
          process.stdout.write(result.brief);
        }
        process.exit(0);
      } catch (err) {
        console.error(
          `Error: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exit(2);
      }
    });
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
  const config = await loadGhostRelayConfig({
    cwd: options.cwd,
    root: options.root,
    explicitPath: options.configPath,
    ghostDir: options.ghostDir,
    packageDir: context.packageDir,
  });
  const projections = await projectRelaySources(config, {
    requestedCapabilities,
  });
  const relayContext = buildGhostRelayContext(selectedContext, {
    mode,
    config,
    projections,
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
      options.source.kind === "stack" ? options.source.ghostDir : undefined,
    stackDirs,
    selected_context: selectedContext,
    context: relayContext,
    brief: formatRelayBrief(partial),
  };
}
