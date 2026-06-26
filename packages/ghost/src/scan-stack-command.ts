import type { CAC } from "cac";
import {
  fingerprintPackageDisplayPath,
  type GhostFingerprintStack,
  loadFingerprintStackForPath,
  resolveGhostDirDefault,
} from "./scan/index.js";

export function registerStackCommand(cli: CAC): void {
  cli
    .command(
      "stack [paths...]",
      "Inspect the nested Ghost fingerprint stack for one or more repo paths.",
    )
    .option("--format <fmt>", "Output format: cli or json", { default: "cli" })
    .action(async (paths: string[] | string | undefined, opts) => {
      try {
        const ghostDir = resolveGhostDirDefault();
        const requestedPaths = Array.isArray(paths)
          ? paths
          : typeof paths === "string"
            ? [paths]
            : [];
        const targets = requestedPaths.length > 0 ? requestedPaths : ["."];
        const stacks = await Promise.all(
          targets.map((path) =>
            loadFingerprintStackForPath(path, process.cwd(), { ghostDir }),
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
    ghost_dir: stack.ghost_dir,
    stack: stack.layers.map((layer) => ({
      dir: layer.dir,
      root: layer.root,
      relative_root: layer.relative_root,
      ghost_dir: layer.ghost_dir,
      fingerprint_id: layer.fingerprint.intent.summary.product ?? null,
      checks: layer.checks?.checks.length ?? 0,
    })),
    contract: {
      fingerprint: stack.contract.fingerprint,
      checks: stack.contract.checks,
    },
    provenance: {
      stack: stack.provenance.layers,
    },
  };
}

function formatStackCli(stack: GhostFingerprintStack): string {
  const lines = [
    `target: ${stack.target_path}`,
    `repo root: ${stack.repo_root}`,
    "stack:",
    ...stack.layers.map(
      (layer) =>
        `  - ${fingerprintPackageDisplayPath(layer.relative_root, layer.ghost_dir)} (${layer.fingerprint.intent.summary.product ?? "unnamed"})`,
    ),
    "contract:",
    `  situations: ${stack.contract.fingerprint.intent.situations.length}`,
    `  principles: ${stack.contract.fingerprint.intent.principles.length}`,
    `  contracts: ${stack.contract.fingerprint.intent.experience_contracts.length}`,
    `  patterns: ${stack.contract.fingerprint.composition.patterns.length}`,
    `  active checks: ${
      stack.contract.checks.checks.filter((check) => check.status === "active")
        .length
    }`,
    "",
  ];
  return `${lines.join("\n")}\n`;
}
