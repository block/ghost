import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import type { CAC } from "cac";
import {
  type LintReport,
  lintFingerprintPackage,
  resolveFingerprintPackage,
} from "../fingerprint.js";
import { detectFileKind, lintDetectedFileKind } from "../scan/file-kind.js";
import { resolveGhostDirDefault } from "../scan/index.js";
import { failFromError } from "./errors.js";
import { registerInitCommand } from "./init-command.js";

/**
 * Register fingerprint package commands on the unified Ghost CLI.
 *
 * Verbs author and validate the root `.ghost/` fingerprint package: `init`
 * (scaffold) and `validate` (artifact shape + node-graph integrity).
 */
export function registerFingerprintCommands(cli: CAC): void {
  // --- validate (shape pass + graph pass) ---
  cli
    .command(
      "validate [file]",
      "Validate the Ghost fingerprint package — artifact shape and the node graph (links resolve, one root, acyclic). Defaults to .ghost.",
    )
    .option("--format <fmt>", "Output format: cli or json", { default: "cli" })
    .action(async (path: string | undefined, opts) => {
      try {
        const ghostDir = ghostDirFromEnv();
        const packagePath = path ?? ghostDir;
        const target = resolveFingerprintPackage(
          packagePath,
          process.cwd(),
        ).dir;
        let report: LintReport;
        if (path === undefined || (await isDirectory(target))) {
          report = await lintFingerprintPackage(packagePath, process.cwd());
          writeLintReport(report, opts.format);
          process.exit(report.errors > 0 ? 1 : 0);
          return;
        }

        const fileTarget = resolve(process.cwd(), path ?? target);
        const raw = await readFile(fileTarget, "utf-8");
        const kind = detectFileKind(fileTarget, raw);
        report = lintDetectedFileKind(kind, raw);

        writeLintReport(report, opts.format);

        process.exit(report.errors > 0 ? 1 : 0);
      } catch (err) {
        failFromError(err);
      }
    });

  registerInitCommand(cli);
}

function ghostDirFromEnv(): string {
  return resolveGhostDirDefault();
}

function writeLintReport(report: LintReport, format: unknown): void {
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
