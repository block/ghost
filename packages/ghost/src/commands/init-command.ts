import type { CAC } from "cac";
import { UsageError } from "#ghost-core";
import { initFingerprintPackage } from "../fingerprint.js";
import { addChecksDir } from "../scan/check-scaffold.js";
import { resolveGhostDirDefault } from "../scan/index.js";
import { failFromError } from "./errors.js";

export function registerInitCommand(cli: CAC): void {
  cli
    .command("init", "Create a root .ghost node fingerprint package")
    .option(
      "--package <dir>",
      "Exact fingerprint package directory to initialize",
    )
    .option(
      "--template <name>",
      "Init template to scaffold (default: skeleton)",
    )
    .option(
      "--with <capabilities>",
      "Comma-separated capabilities to add after scaffolding (e.g. checks)",
    )
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

        const withIds = parseWithCapabilities(opts.with);
        for (const id of withIds) {
          if (id !== "checks") {
            throw new UsageError(
              `Unknown --with capability '${id}'. Available: checks.`,
            );
          }
        }
        const addedChecks = withIds.includes("checks")
          ? await addChecksDir(result.paths.packageDir)
          : undefined;

        if (opts.format === "json") {
          process.stdout.write(
            `${JSON.stringify(
              {
                dir: result.paths.dir,
                written: result.written,
                ...(addedChecks !== undefined
                  ? { checks: { written: addedChecks.written } }
                  : {}),
              },
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
          if (addedChecks !== undefined) {
            process.stdout.write("Added checks/:\n");
            for (const file of addedChecks.written) {
              process.stdout.write(`  checks/${file}\n`);
            }
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

function parseWithCapabilities(withOpt: unknown): string[] {
  if (typeof withOpt !== "string" || withOpt.trim().length === 0) return [];
  return [
    ...new Set(
      withOpt
        .split(",")
        .map((id) => id.trim())
        .filter((id) => id.length > 0),
    ),
  ];
}
