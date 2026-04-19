import { diff, formatDiffCLI, formatDiffJSON, loadConfig } from "@ghost/core";
import type { CAC } from "cac";

/**
 * `ghost drift` — compare the local component tree against the registry.
 * Breaks out what used to be `ghost compare --components`; the two verbs
 * share no positional args (drift takes none, compare takes N expressions),
 * so hiding this behind a flag on compare was muddying both mental models.
 */
export function registerDriftCommand(cli: CAC): void {
  cli
    .command(
      "drift",
      "Diff local components against the registry. Reports breaking changes.",
    )
    .option("-c, --config <path>", "Path to ghost config file")
    .option("--component <name>", "Limit to a single component")
    .option("--format <fmt>", "Output format: cli or json", { default: "cli" })
    .action(async (opts) => {
      try {
        const config = await loadConfig(opts.config);
        const results = await diff(config, opts.component || undefined);
        const output =
          opts.format === "json"
            ? formatDiffJSON(results)
            : formatDiffCLI(results);
        process.stdout.write(output);
        const hasBreaking = results.some((r) =>
          r.components.some((c) => c.severity === "error"),
        );
        process.exit(hasBreaking ? 1 : 0);
      } catch (err) {
        console.error(
          `Error: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exit(2);
      }
    });
}
