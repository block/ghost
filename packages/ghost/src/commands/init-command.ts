import type { CAC } from "cac";
import { initFingerprintPackage } from "../fingerprint.js";
import { addHaunt } from "../scan/haunt-scaffold.js";
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
      "Init template to scaffold (default: steering)",
    )
    .option(
      "--with <haunts>",
      "Comma-separated haunts to add after scaffolding (e.g. checks)",
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

        const hauntIds = parseWithHaunts(opts.with);
        const addedHaunts: Array<{ id: string; written: string[] }> = [];
        for (const hauntId of hauntIds) {
          const added = await addHaunt(result.paths.packageDir, hauntId);
          addedHaunts.push({ id: hauntId, written: added.written });
        }

        if (opts.format === "json") {
          process.stdout.write(
            `${JSON.stringify(
              {
                dir: result.paths.dir,
                written: result.written,
                ...(addedHaunts.length > 0 ? { haunts: addedHaunts } : {}),
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
          for (const haunt of addedHaunts) {
            process.stdout.write(`Added haunt '${haunt.id}':\n`);
            for (const file of haunt.written) {
              process.stdout.write(`  haunts/${haunt.id}/${file}\n`);
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

function parseWithHaunts(withOpt: unknown): string[] {
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
