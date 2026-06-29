import type { CAC } from "cac";
import { initFingerprintPackage } from "../fingerprint.js";
import { resolveGhostDirDefault } from "../scan/index.js";
import { failFromError } from "./errors.js";

export function registerInitCommand(cli: CAC): void {
  cli
    .command("init", "Create a root .ghost node fingerprint package")
    .option(
      "--package <dir>",
      "Exact fingerprint package directory to initialize",
    )
    .option("--template <name>", "Init template to scaffold (default: default)")
    .option("--force", "Overwrite existing Ghost fingerprint files")
    .option("--format <fmt>", "Output format: cli or json", { default: "cli" })
    .action(async (opts) => {
      try {
        if (cli.args.length > 0) {
          console.error(
            "Error: ghost init no longer accepts a positional directory. Use --package <dir> for an exact package directory.",
          );
          process.exit(2);
          return;
        }
        const exactPackage =
          typeof opts.package === "string" ? opts.package : undefined;
        const ghostDir =
          exactPackage === undefined ? ghostDirFromEnv() : undefined;
        const result = await initFingerprintPackage(
          exactPackage ?? ghostDir,
          process.cwd(),
          {
            ...(typeof opts.template === "string"
              ? { template: opts.template }
              : {}),
            force: Boolean(opts.force),
          },
        );
        if (opts.format === "json") {
          process.stdout.write(
            `${JSON.stringify(
              { dir: result.paths.dir, written: result.written },
              null,
              2,
            )}\n`,
          );
        } else {
          process.stdout.write(
            `Initialized Ghost fingerprint package: ${result.paths.dir}\n`,
          );
          for (const relativePath of result.written) {
            process.stdout.write(`  ${relativePath}\n`);
          }
        }
        process.exit(0);
      } catch (err) {
        failFromError(err);
      }
    });
}

function ghostDirFromEnv(): string {
  return resolveGhostDirDefault();
}
