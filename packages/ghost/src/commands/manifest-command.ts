import type { CAC } from "cac";
import { buildCliManifest } from "./command-discovery.js";
import { exitCli, failFromError } from "./errors.js";

/**
 * Emit a self-describing manifest of the CLI: every command, its curated
 * discovery metadata, and its flags. Lets a host agent learn the CLI in one
 * call instead of scraping `--help`. Derived from the cac registry, so it can
 * never drift from the real command definitions.
 */
export function registerManifestCommand(cli: CAC): void {
  cli
    .command(
      "manifest",
      "Emit a self-describing JSON manifest of every command and flag.",
    )
    .option("--format <fmt>", "Output format: json", { default: "json" })
    .action(async (opts) => {
      try {
        if (opts.format !== "json") {
          console.error("Error: ghost manifest supports only --format json");
          await exitCli(2);
          return;
        }
        const manifest = {
          apiVersion: 1,
          type: "manifest" as const,
          data: buildCliManifest(cli, cli.name),
        };
        process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
        await exitCli(0);
      } catch (err) {
        await failFromError(err);
      }
    });
}
