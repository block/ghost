import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { cac } from "cac";
import { inventory, lintMap, MAP_FILENAME } from "./core/index.js";

/**
 * Build the cac CLI for `ghost-map`.
 *
 * Two verbs are wired up here: `inventory` (deterministic raw signals as
 * JSON) and `lint` (validate a `map.md`). Both are reproducible from inputs
 * — no LLM, no network beyond best-effort `git`.
 */
export function buildCli(): ReturnType<typeof cac> {
  const cli = cac("ghost-map");

  // --- inventory ---
  cli
    .command(
      "inventory [path]",
      "Emit deterministic raw signals about a frontend repo as JSON: package manifests, language histogram, candidate config files, registry presence, top-level tree, git remote.",
    )
    .action(async (path: string | undefined) => {
      try {
        const target = resolve(process.cwd(), path ?? ".");
        const out = inventory(target);
        process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
        process.exit(0);
      } catch (err) {
        process.stderr.write(
          `Error: ${err instanceof Error ? err.message : String(err)}\n`,
        );
        process.exit(2);
      }
    });

  // --- lint ---
  cli
    .command("lint [map]", "Validate map.md against ghost.map/v1")
    .option("--format <fmt>", "Output format: cli or json", { default: "cli" })
    .action(async (path: string | undefined, opts: { format?: string }) => {
      try {
        const target = resolve(process.cwd(), path ?? MAP_FILENAME);
        const raw = await readFile(target, "utf-8");
        const report = lintMap(raw);

        if (opts.format === "json") {
          process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
        } else {
          for (const issue of report.issues) {
            const prefix =
              issue.severity === "error"
                ? "ERROR"
                : issue.severity === "warning"
                  ? "WARN "
                  : "INFO ";
            const pathSuffix = issue.path ? ` @ ${issue.path}` : "";
            process.stdout.write(
              `${prefix} [${issue.rule}] ${issue.message}${pathSuffix}\n`,
            );
          }
          process.stdout.write(
            `\n${report.errors} error(s), ${report.warnings} warning(s), ${report.info} info\n`,
          );
        }

        process.exit(report.errors > 0 ? 1 : 0);
      } catch (err) {
        process.stderr.write(
          `Error: ${err instanceof Error ? err.message : String(err)}\n`,
        );
        process.exit(2);
      }
    });

  cli.help();
  cli.version(readPackageVersion());

  return cli;
}

function readPackageVersion(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const pkg = JSON.parse(
    readFileSync(resolve(here, "../package.json"), "utf8"),
  );
  return pkg.version as string;
}
