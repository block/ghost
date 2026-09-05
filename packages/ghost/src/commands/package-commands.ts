import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import type { CAC } from "cac";
import { UsageError } from "#ghost-core";
import { isMissingPathError } from "../internal/fs.js";
import {
  type LintReport,
  lintGhostPackage,
  resolveGhostPackage,
} from "../package.js";
import { detectFileKind, lintDetectedFileKind } from "../scan/file-kind.js";
import { exitCli, failFromError } from "./errors.js";
import { registerInitCommand } from "./init-command.js";
import { parseEnumOption } from "./options.js";

/**
 * Register ghost package commands on the unified ghost CLI.
 *
 * Verbs author and validate the root `.ghost/` package: `init`
 * (scaffold) and `validate` (manifest shape, node validity, material locators,
 * check references, and glossary kind prefixes).
 */
export function registerPackageCommands(cli: CAC): void {
  // --- validate (shape pass + catalog pass) ---
  cli
    .command(
      "validate [file]",
      "Validate the ghost package: manifest shape, node validity, material locators, check references, and glossary kind prefixes. Defaults to .ghost.",
    )
    .option(
      "--package <dir>",
      "Use this ghost package directory (default: ./.ghost)",
    )
    .option("--format <fmt>", "Output format: cli or json", { default: "cli" })
    .action(async (path: string | undefined, opts) => {
      try {
        const format = parseEnumOption(opts.format, "--format", [
          "cli",
          "json",
        ] as const);
        const exactPackage =
          typeof opts.package === "string" ? opts.package : undefined;
        const packagePath = exactPackage ?? path;
        const target = resolveGhostPackage(packagePath, process.cwd()).dir;
        let report: LintReport;
        if (path === undefined || (await isDirectory(target))) {
          report = await lintGhostPackage(packagePath, process.cwd());
          writeLintReport(report, format);
          await exitCli(report.errors > 0 ? 1 : 0);
          return;
        }

        const fileTarget = resolve(process.cwd(), path ?? target);
        let raw: string;
        try {
          raw = await readFile(fileTarget, "utf-8");
        } catch (err) {
          if (isMissingPathError(err)) {
            throw new UsageError(
              `Cannot validate ${path} because the file does not exist. Check the path, or run \`ghost validate --package <dir>\` for a package.`,
            );
          }
          throw err;
        }
        const kind = detectFileKind(fileTarget, raw);
        report = lintDetectedFileKind(kind, raw);

        writeLintReport(report, format);

        await exitCli(report.errors > 0 ? 1 : 0);
      } catch (err) {
        await failFromError(err);
      }
    });

  registerInitCommand(cli);
}

function writeLintReport(report: LintReport, format: "cli" | "json"): void {
  if (format === "json") {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }

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

async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}
