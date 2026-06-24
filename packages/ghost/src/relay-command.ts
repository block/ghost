import type { CAC } from "cac";
import { isRelayMode } from "./context/relay-modes.js";
import { readRelayRequestOption } from "./context/relay-request-input.js";
import { gatherRelayContext } from "./relay.js";

export function registerRelayCommand(cli: CAC): void {
  cli
    .command(
      "relay <action> [target]",
      "Gather Relay context for an agent target.",
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
    .option("--request <file>", "Load a structured Ghost Relay request")
    .option(
      "--request-stdin",
      "Read a structured Ghost Relay request from stdin",
    )
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
        if (opts.request && opts.requestStdin) {
          console.error("Error: use either --request or --request-stdin");
          process.exit(2);
          return;
        }
        const request = await readRelayRequestOption(opts);

        const result = await gatherRelayContext({
          target: target ?? ".",
          packageDir:
            typeof opts.package === "string" ? opts.package : undefined,
          name: typeof opts.name === "string" ? opts.name : undefined,
          config: typeof opts.config === "string" ? opts.config : undefined,
          mode: opts.mode,
          request,
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
