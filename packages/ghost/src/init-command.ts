import type { CAC } from "cac";
import {
  initFingerprintPackage,
  initScopedFingerprintPackage,
  type resolveFingerprintPackage,
} from "./fingerprint.js";
import {
  initMonorepoFingerprintPackages,
  writeMonorepoInitOutput,
} from "./monorepo-init-command.js";
import { resolveGhostDirDefault } from "./scan/index.js";

export function registerInitCommand(cli: CAC): void {
  cli
    .command("init", "Create a root .ghost split fingerprint package")
    .option(
      "--scope <path>",
      "Create a scoped <path>/.ghost fingerprint package",
    )
    .option(
      "--package <dir>",
      "Exact fingerprint package directory to initialize",
    )
    .option(
      "--reference <path-or-registry>",
      "Reference UI registry, library path, or fingerprint to record in inventory building blocks",
    )
    .option(
      "--monorepo",
      "Detect monorepo child package roots and propose scoped Ghost packages",
    )
    .option("--apply", "With --monorepo, create detected child scoped packages")
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
        if (opts.monorepo && typeof opts.scope === "string") {
          console.error(
            "Error: use either init --scope <path> or init --monorepo",
          );
          process.exit(2);
          return;
        }
        if (opts.apply && !opts.monorepo) {
          console.error("Error: --apply can only be used with --monorepo");
          process.exit(2);
          return;
        }
        if (opts.monorepo && typeof opts.package === "string") {
          console.error(
            "Error: use either init --package <dir> or init --monorepo",
          );
          process.exit(2);
          return;
        }
        if (
          typeof opts.scope === "string" &&
          typeof opts.package === "string"
        ) {
          console.error(
            "Error: use either init --package <dir> or init --scope <path>",
          );
          process.exit(2);
          return;
        }
        const exactPackage =
          typeof opts.package === "string" ? opts.package : undefined;
        const ghostDir =
          exactPackage === undefined ? ghostDirFromEnv() : undefined;
        const initOptions = {
          reference:
            typeof opts.reference === "string" ? opts.reference : undefined,
          force: Boolean(opts.force),
        };
        if (opts.monorepo) {
          const output = await initMonorepoFingerprintPackages({
            ghostDir: ghostDir ?? ghostDirFromEnv(),
            apply: Boolean(opts.apply),
            initOptions,
          });
          writeMonorepoInitOutput(output, opts.format);
          process.exit(output.errors.length > 0 ? 2 : 0);
          return;
        }
        const paths =
          typeof opts.scope === "string"
            ? await initScopedFingerprintPackage(opts.scope, process.cwd(), {
                ...initOptions,
                ghostDir: ghostDir ?? ghostDirFromEnv(),
              })
            : await initFingerprintPackage(
                exactPackage ?? ghostDir,
                process.cwd(),
                initOptions,
              );
        if (opts.format === "json") {
          process.stdout.write(
            `${JSON.stringify(initCommandOutput(paths), null, 2)}\n`,
          );
        } else {
          process.stdout.write(
            `Initialized Ghost fingerprint package: ${paths.dir}\n`,
          );
          process.stdout.write(`  manifest.yml: ${paths.manifest}\n`);
          process.stdout.write(`  intent.yml: ${paths.intent}\n`);
          process.stdout.write(`  inventory.yml: ${paths.inventory}\n`);
          process.stdout.write(`  composition.yml: ${paths.composition}\n`);
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

function ghostDirFromEnv(): string {
  return resolveGhostDirDefault();
}

function initCommandOutput(
  paths: ReturnType<typeof resolveFingerprintPackage>,
): Record<string, string> {
  return {
    dir: paths.dir,
    manifest: paths.manifest,
    intent: paths.intent,
    inventory: paths.inventory,
    composition: paths.composition,
  };
}
