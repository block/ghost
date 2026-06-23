import type { CAC } from "cac";
import {
  fingerprintPackageDisplayPath,
  type GhostFingerprintStack,
  loadFingerprintStackForPath,
  resolveMemoryDirDefault,
} from "./scan/index.js";

export function registerStackCommand(cli: CAC): void {
  cli
    .command(
      "stack [paths...]",
      "Inspect the nested Ghost fingerprint stack for one or more repo paths.",
    )
    .option(
      "--memory-dir <relative-dir>",
      "Relative fingerprint package directory for host wrappers and stack discovery (env: GHOST_MEMORY_DIR; default: .ghost)",
    )
    .option("--format <fmt>", "Output format: cli or json", { default: "cli" })
    .action(async (paths: string[] | string | undefined, opts) => {
      try {
        const memoryDir = resolveMemoryDirDefault(opts.memoryDir);
        const requestedPaths = Array.isArray(paths)
          ? paths
          : typeof paths === "string"
            ? [paths]
            : [];
        const targets = requestedPaths.length > 0 ? requestedPaths : ["."];
        const stacks = await Promise.all(
          targets.map((path) =>
            loadFingerprintStackForPath(path, process.cwd(), { memoryDir }),
          ),
        );
        if (opts.format === "json") {
          process.stdout.write(
            `${JSON.stringify(stacks.map(formatStackJson), null, 2)}\n`,
          );
        } else {
          for (const stack of stacks) {
            process.stdout.write(formatStackCli(stack));
          }
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

function formatStackJson(
  stack: GhostFingerprintStack,
): Record<string, unknown> {
  return {
    target_path: stack.target_path,
    repo_root: stack.repo_root,
    fingerprint_dir: stack.fingerprint_dir,
    layers: stack.layers.map((layer) => ({
      dir: layer.dir,
      root: layer.root,
      relative_root: layer.relative_root,
      fingerprint_dir: layer.fingerprint_dir,
      fingerprint_id: layer.fingerprint.intent.summary.product ?? null,
      checks: layer.checks?.checks.length ?? 0,
    })),
    merged: {
      fingerprint: stack.merged.fingerprint,
      checks: stack.merged.checks,
    },
    provenance: stack.provenance,
  };
}

function formatStackCli(stack: GhostFingerprintStack): string {
  const lines = [
    `target: ${stack.target_path}`,
    `repo root: ${stack.repo_root}`,
    "layers:",
    ...stack.layers.map(
      (layer) =>
        `  - ${fingerprintPackageDisplayPath(layer.relative_root, layer.fingerprint_dir)} (${layer.fingerprint.intent.summary.product ?? "unnamed"})`,
    ),
    "merged:",
    `  situations: ${stack.merged.fingerprint.intent.situations.length}`,
    `  principles: ${stack.merged.fingerprint.intent.principles.length}`,
    `  contracts: ${stack.merged.fingerprint.intent.experience_contracts.length}`,
    `  patterns: ${stack.merged.fingerprint.composition.patterns.length}`,
    `  active checks: ${
      stack.merged.checks.checks.filter((check) => check.status === "active")
        .length
    }`,
    "",
  ];
  return `${lines.join("\n")}\n`;
}
