import type { CAC } from "cac";
import { UsageError } from "#ghost-core";
import { initFingerprintPackage } from "../fingerprint.js";
import { addChecksDir } from "../scan/check-scaffold.js";
import { getInitBody } from "../scan/templates.js";
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
      "--body <name>",
      "Init body to install: a full inhabited package (e.g. vessel-light)",
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
        const withIds = parseWithCapabilities(opts.with);
        for (const id of withIds) {
          if (id !== "checks") {
            throw new UsageError(
              `Unknown --with capability '${id}'. Available: checks.`,
            );
          }
        }
        const body =
          typeof opts.body === "string" ? getInitBody(opts.body) : undefined;
        if (body?.includesChecks && withIds.includes("checks")) {
          throw new UsageError(
            `--with checks is redundant with --body ${body.name} — this body already includes its own checks/.`,
          );
        }

        const result = await initFingerprintPackage(
          exactPackage,
          process.cwd(),
          {
            ...(typeof opts.template === "string"
              ? { template: opts.template }
              : {}),
            ...(typeof opts.body === "string" ? { body: opts.body } : {}),
            force: Boolean(opts.force),
          },
        );
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
                  ? {
                      checks: {
                        written: addedChecks.written,
                        skipped: addedChecks.skipped,
                      },
                    }
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
            for (const file of addedChecks.skipped) {
              process.stdout.write(`  skipped checks/${file}\n`);
            }
          }
        }
        process.exit(0);
      } catch (err) {
        failFromError(err);
      }
    });
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
