import type { CAC } from "cac";
import { resolveFingerprintPackage } from "../fingerprint.js";
import { addChecksDir } from "../scan/check-scaffold.js";
import { failFromError } from "./errors.js";

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
      "Use this fingerprint package directory (default: ./.ghost)",
    )
    .option("--format <fmt>", "Output format: cli or json", { default: "cli" })
    .action(async (action: string, opts) => {
      try {
        if (opts.format !== "cli" && opts.format !== "json") {
          console.error("Error: --format must be 'cli' or 'json'");
          process.exit(2);
          return;
        }
        if (action !== "init") {
          console.error("Error: ghost checks supports `init`");
          process.exit(2);
          return;
        }

        const paths = resolveFingerprintPackage(opts.package, process.cwd());
        const result = await addChecksDir(paths.packageDir);
        if (opts.format === "json") {
          process.stdout.write(
            `${JSON.stringify(
              { dir: result.dir, written: result.written },
              null,
              2,
            )}\n`,
          );
        } else {
          process.stdout.write(`Added checks/: ${result.dir}\n`);
          for (const file of result.written) {
            process.stdout.write(`  ${file}\n`);
          }
        }
        process.exit(0);
      } catch (err) {
        failFromError(err);
      }
    });
}
