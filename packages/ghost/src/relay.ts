import type { CAC } from "cac";
import {
  buildCascadeBrief,
  type CascadeBrief,
  formatCascadeBriefMarkdown,
} from "./context/cascade-brief.js";
import {
  buildContextEntrypoint,
  type ContextEntrypoint,
} from "./context/entrypoint.js";
import { formatContextEntrypointMarkdown } from "./context/entrypoint-markdown.js";
import {
  loadPackageContext,
  type PackageContext,
} from "./context/package-context.js";
import { resolveFingerprintPackage } from "./fingerprint.js";
import {
  fingerprintStackToPackageContext,
  type GhostFingerprintStack,
  loadFingerprintStackForPath,
  resolveMemoryDirDefault,
} from "./scan/fingerprint-stack.js";

export type {
  CascadeBrief,
  CascadeGap,
  CascadeInventoryItem,
  CascadeNodeSummary,
  CascadeObligation,
  CascadePackage,
} from "./context/cascade-brief.js";

export const RELAY_GATHER_SCHEMA = "ghost.relay.gather/v1" as const;

export interface GatherRelayContextOptions {
  cwd?: string;
  target?: string;
  packageDir?: string;
  memoryDir?: string;
  name?: string;
}

export type RelayGatherSource =
  | {
      kind: "stack";
      repoRoot: string;
      targetPath: string;
      fingerprintDir: string;
      layers: string[];
      provenance: GhostFingerprintStack["provenance"];
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
  fingerprintDir?: string;
  layerDirs: string[];
  entrypoint: ContextEntrypoint;
  cascade_brief: CascadeBrief;
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
      source: {
        kind: "package",
        packageDir: context.fingerprintDir ?? options.packageDir,
        targetPath: targetPaths[0] ?? null,
      },
      targetPaths,
    });
  }

  const memoryDir = resolveMemoryDirDefault(options.memoryDir);
  const stack = await loadFingerprintStackForPath(target, cwd, { memoryDir });
  const context = fingerprintStackToPackageContext(stack, options.name);
  return gatherFromContext(context, {
    source: {
      kind: "stack",
      repoRoot: stack.repo_root,
      targetPath: stack.target_path,
      fingerprintDir: stack.fingerprint_dir,
      layers: stack.layers.map((layer) => layer.dir),
      provenance: stack.provenance,
    },
    targetPaths: context.targetPaths ?? [stack.target_path],
  });
}

export function formatRelayBrief(
  result:
    | Pick<RelayGatherResult, "cascade_brief">
    | Pick<RelayGatherResult, "entrypoint">,
): string {
  if ("cascade_brief" in result) {
    return formatCascadeBriefMarkdown(result.cascade_brief);
  }
  return formatContextEntrypointMarkdown(result.entrypoint, {
    heading: "# Ghost Relay Brief",
  });
}

export function formatLegacyRelayBrief(
  result: Pick<RelayGatherResult, "entrypoint">,
): string {
  return formatContextEntrypointMarkdown(result.entrypoint, {
    heading: "# Ghost Relay Brief",
  });
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
      "--memory-dir <relative-dir>",
      "Relative fingerprint package directory for host wrappers and stack resolution (env: GHOST_MEMORY_DIR; default: .ghost)",
    )
    .option(
      "--name <name>",
      "Override the gathered context name (default: intent.yml product or resolved scope)",
    )
    .option("--format <fmt>", "Output format: markdown or json", {
      default: "markdown",
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

        const result = await gatherRelayContext({
          target: target ?? ".",
          packageDir:
            typeof opts.package === "string" ? opts.package : undefined,
          memoryDir:
            typeof opts.memoryDir === "string" ? opts.memoryDir : undefined,
          name: typeof opts.name === "string" ? opts.name : undefined,
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

function gatherFromContext(
  context: PackageContext,
  options: { source: RelayGatherSource; targetPaths: string[] },
): RelayGatherResult {
  const entrypoint = buildContextEntrypoint(context, {
    targetPaths: options.targetPaths,
  });
  const cascadeBrief = buildCascadeBrief(context, entrypoint);
  const partial = { cascade_brief: cascadeBrief };
  return {
    schema: RELAY_GATHER_SCHEMA,
    name: context.name,
    source: options.source,
    targetPaths: entrypoint.match.requestedPaths,
    fingerprintDir: context.fingerprintDir,
    layerDirs: context.layerDirs ?? [],
    entrypoint,
    cascade_brief: cascadeBrief,
    brief: formatRelayBrief(partial),
  };
}
