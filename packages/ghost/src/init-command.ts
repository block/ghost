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
import { resolveMemoryDirDefault } from "./scan/index.js";

export function registerInitCommand(cli: CAC): void {
  cli
    .command("init [dir]", "Create a root .ghost split fingerprint package")
    .option(
      "--scope <path>",
      "Create a scoped <path>/<memory-dir> fingerprint package",
    )
    .option(
      "--memory-dir <relative-dir>",
      "Relative fingerprint package directory for host wrappers, init --scope, and default root init (env: GHOST_MEMORY_DIR; default: .ghost)",
    )
    .option(
      "--with-intent",
      "Also create optional fingerprint/memory/intent.md for human-authored or human-approved intent",
    )
    .option(
      "--with-config",
      "Also create optional config.yml for implementation roots and reference registries/libraries",
    )
    .option(
      "--reference <path-or-registry>",
      "Reference UI registry, library path, or fingerprint to record in config.yml and inventory building blocks",
    )
    .option(
      "--monorepo",
      "Detect monorepo child package roots and propose scoped Ghost packages",
    )
    .option("--apply", "With --monorepo, create detected child scoped packages")
    .option("--force", "Overwrite existing Ghost fingerprint files")
    .option("--format <fmt>", "Output format: cli or json", { default: "cli" })
    .action(async (dirArg: string | undefined, opts) => {
      try {
        if (opts.monorepo && dirArg) {
          console.error("Error: use either init [dir] or init --monorepo");
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
        if (dirArg && typeof opts.scope === "string") {
          console.error("Error: use either init [dir] or init --scope <path>");
          process.exit(2);
          return;
        }
        if (dirArg && typeof opts.memoryDir === "string") {
          console.error("Error: use either init [dir] or --memory-dir");
          process.exit(2);
          return;
        }
        const memoryDir =
          typeof opts.scope === "string" || dirArg === undefined
            ? memoryDirFromOpts(opts)
            : undefined;
        const initOptions = {
          withIntent: Boolean(opts.withIntent),
          withConfig: Boolean(opts.withConfig || opts.reference),
          reference:
            typeof opts.reference === "string" ? opts.reference : undefined,
          force: Boolean(opts.force),
        };
        if (opts.monorepo) {
          const output = await initMonorepoFingerprintPackages({
            memoryDir: memoryDirFromOpts(opts),
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
                memoryDir,
              })
            : await initFingerprintPackage(
                dirArg ?? memoryDir,
                process.cwd(),
                initOptions,
              );
        if (opts.format === "json") {
          process.stdout.write(
            `${JSON.stringify(
              initCommandOutput(paths, {
                includeIntent: Boolean(opts.withIntent),
                includeConfig: Boolean(opts.withConfig || opts.reference),
              }),
              null,
              2,
            )}\n`,
          );
        } else {
          process.stdout.write(
            `Initialized Ghost fingerprint package: ${paths.dir}\n`,
          );
          process.stdout.write(`  manifest.yml: ${paths.manifest}\n`);
          process.stdout.write(`  prose.yml: ${paths.prose}\n`);
          process.stdout.write(`  inventory.yml: ${paths.inventory}\n`);
          process.stdout.write(`  composition.yml: ${paths.composition}\n`);
          process.stdout.write(`  enforcement/checks.yml: ${paths.checks}\n`);
          if (opts.withConfig || opts.reference) {
            process.stdout.write(`  config.yml: ${paths.config}\n`);
          }
          if (opts.withIntent) {
            process.stdout.write(`  memory/intent.md: ${paths.intent}\n`);
          }
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

function memoryDirFromOpts(opts: { memoryDir?: unknown }): string {
  return resolveMemoryDirDefault(opts.memoryDir);
}

function initCommandOutput(
  paths: ReturnType<typeof resolveFingerprintPackage>,
  options: { includeIntent: boolean; includeConfig: boolean },
): Record<string, string> {
  return {
    dir: paths.dir,
    fingerprintDir: paths.fingerprintDir,
    manifest: paths.manifest,
    prose: paths.prose,
    inventory: paths.inventory,
    composition: paths.composition,
    ...(options.includeConfig ? { config: paths.config } : {}),
    checks: paths.checks,
    ...(options.includeIntent ? { intent: paths.intent } : {}),
  };
}
