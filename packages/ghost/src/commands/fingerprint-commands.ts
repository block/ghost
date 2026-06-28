import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import type { CAC } from "cac";
import {
  type LintReport,
  lintFingerprintPackage,
  resolveFingerprintPackage,
} from "../fingerprint.js";
import { detectFileKind, lintDetectedFileKind } from "../scan/file-kind.js";
import { resolveGhostDirDefault, scanStatus, signals } from "../scan/index.js";
import { registerInitCommand } from "./init-command.js";

/**
 * Register fingerprint package commands on the unified Ghost CLI.
 *
 * Verbs author and validate the root `.ghost/` fingerprint package: `validate`
 * (artifact shape + node-graph integrity), `scan` (node/surface contribution),
 * and `signals` (raw repo signals for authoring).
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
        console.error(
          `Error: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exit(2);
      }
    });

  registerInitCommand(cli);

  // --- scan ---
  cli
    .command(
      "scan [dir]",
      "Report sparse fingerprint package contribution facets: intent, inventory, composition, and the next BYOA step.",
    )
    .option("--format <fmt>", "Output format: cli or json", { default: "cli" })
    .action(async (dirArg: string | undefined, opts) => {
      try {
        const ghostDir = ghostDirFromEnv();
        const dir = resolveFingerprintPackage(
          dirArg ?? ghostDir,
          process.cwd(),
        ).dir;
        const status = await scanStatus(dir);
        if (opts.format === "json") {
          process.stdout.write(`${JSON.stringify(status, null, 2)}\n`);
        } else {
          const fmt = (state: string) =>
            state === "present" ? "present" : "missing";
          process.stdout.write(`package dir: ${status.dir}\n\n`);
          process.stdout.write(
            `  package    (manifest.yml): ${fmt(status.fingerprint.state)}\n`,
          );
          process.stdout.write("\n");
          if (status.recommended_next) {
            process.stdout.write(
              `next: run the ${status.recommended_next} stage\n`,
            );
          } else {
            process.stdout.write(
              "next: author nodes, then run ghost check/review\n",
            );
          }
          const c = status.contribution;
          process.stdout.write(`contribution: ${c.state}\n`);
          process.stdout.write(
            `  nodes: ${c.node_count} (${c.essence_count} essence, ${c.incarnation_count} incarnation-tagged)\n`,
          );
          for (const surface of c.surfaces) {
            process.stdout.write(
              `  surface ${surface.id}: ${surface.node_count} node(s)\n`,
            );
          }
          if (c.sparse_surfaces.length > 0) {
            process.stdout.write(
              `  sparse surfaces: ${c.sparse_surfaces.join(", ")}\n`,
            );
          }
          if (c.reasons[0]) {
            process.stdout.write(`  reason: ${c.reasons[0]}\n`);
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

  // --- signals ---
  cli
    .command(
      "signals [path]",
      "Emit deterministic raw repo signals as JSON: package manifests, language histogram, candidate config files, registry presence, top-level tree, and git remote.",
    )
    .action(async (path: string | undefined) => {
      try {
        const target = resolve(process.cwd(), path ?? ".");
        const out = signals(target);
        process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
        process.exit(0);
      } catch (err) {
        process.stderr.write(
          `Error: ${err instanceof Error ? err.message : String(err)}\n`,
        );
        process.exit(2);
      }
    });
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
