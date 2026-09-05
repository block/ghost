import type { CAC } from "cac";
import { resolveGhostPackage } from "../package.js";
import { addChecksDir } from "../scan/check-scaffold.js";
import { exitCli, failFromError } from "./errors.js";
import { parseEnumOption } from "./options.js";

/**
 * `ghost checks <action>` — manage the flat `.ghost/checks/` directory of
 * review assertions. `init` scaffolds the directory with an example check.
 * Checks are feed-back only: consumed by `ghost review`, never served by
 * `gather` or `pull`.
 */
export function registerChecksCommand(cli: CAC): void {
  cli
    .command("checks <action>", "Manage review checks: init.")
    .option(
      "--package <dir>",
      "Use this ghost package directory (default: ./.ghost)",
    )
    .option("--format <fmt>", "Output format: cli or json", { default: "cli" })
    .action(async (action: string, opts) => {
      try {
        const format = parseEnumOption(opts.format, "--format", [
          "cli",
          "json",
        ] as const);
        if (action !== "init") {
          console.error("Error: ghost checks supports `init`");
          await exitCli(2);
          return;
        }

        const paths = resolveGhostPackage(opts.package, process.cwd());
        const result = await addChecksDir(paths.packageDir);
        if (format === "json") {
          process.stdout.write(
            `${JSON.stringify(
              {
                dir: result.dir,
                written: result.written,
                skipped: result.skipped,
              },
              null,
              2,
            )}\n`,
          );
        } else {
          process.stdout.write(`Added checks/: ${result.dir}\n`);
          for (const file of result.written) {
            process.stdout.write(`  ${file}\n`);
          }
          for (const file of result.skipped) {
            process.stdout.write(`  skipped ${file}\n`);
          }
        }
        await exitCli(0);
      } catch (err) {
        await failFromError(err);
      }
    });
}
