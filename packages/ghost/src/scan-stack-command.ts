import type { CAC } from "cac";
import {
  type GhostMemoryStack,
  loadMemoryStackForPath,
  memoryPackageDisplayPath,
  normalizeMemoryDir,
} from "./scan/index.js";

export function registerStackCommand(cli: CAC): void {
  cli
    .command(
      "stack [paths...]",
      "Inspect the nested Ghost memory stack for one or more repo paths.",
    )
    .option(
      "--memory-dir <relative-dir>",
      "Relative memory package directory for stack discovery (default: .ghost)",
    )
    .option("--format <fmt>", "Output format: cli or json", { default: "cli" })
    .action(async (paths: string[] | string | undefined, opts) => {
      try {
        const memoryDir = normalizeMemoryDir(
          typeof opts.memoryDir === "string" ? opts.memoryDir : undefined,
        );
        const requestedPaths = Array.isArray(paths)
          ? paths
          : typeof paths === "string"
            ? [paths]
            : [];
        const targets = requestedPaths.length > 0 ? requestedPaths : ["."];
        const stacks = await Promise.all(
          targets.map((path) =>
            loadMemoryStackForPath(path, process.cwd(), { memoryDir }),
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

function formatStackJson(stack: GhostMemoryStack): Record<string, unknown> {
  return {
    target_path: stack.target_path,
    repo_root: stack.repo_root,
    memory_dir: stack.memory_dir,
    layers: stack.layers.map((layer) => ({
      dir: layer.dir,
      root: layer.root,
      relative_root: layer.relative_root,
      memory_dir: layer.memory_dir,
      fingerprint_id: layer.fingerprint.summary.product ?? null,
      checks: layer.checks?.checks.length ?? 0,
      proposals: layer.proposals.length,
    })),
    merged: {
      fingerprint: stack.merged.fingerprint,
      checks: stack.merged.checks,
      intent: stack.merged.intent,
      decisions: stack.merged.decisions,
      proposals: stack.merged.proposals,
      open_proposals: stack.merged.open_proposals,
    },
    provenance: stack.provenance,
  };
}

function formatStackCli(stack: GhostMemoryStack): string {
  const lines = [
    `target: ${stack.target_path}`,
    `repo root: ${stack.repo_root}`,
    "layers:",
    ...stack.layers.map(
      (layer) =>
        `  - ${memoryPackageDisplayPath(layer.relative_root, layer.memory_dir)} (${layer.fingerprint.summary.product ?? "unnamed"})`,
    ),
    "merged:",
    `  situations: ${stack.merged.fingerprint.situations.length}`,
    `  principles: ${stack.merged.fingerprint.principles.length}`,
    `  contracts: ${stack.merged.fingerprint.experience_contracts.length}`,
    `  patterns: ${stack.merged.fingerprint.patterns.length}`,
    `  active checks: ${
      stack.merged.checks.checks.filter((check) => check.status === "active")
        .length
    }`,
    `  open proposals: ${stack.merged.open_proposals.length}`,
    "",
  ];
  return `${lines.join("\n")}\n`;
}
