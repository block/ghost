import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { LintReport, LintSeverity } from "@ghost/core";
import { lintExpression } from "@ghost/core";
import type { CAC } from "cac";

export function registerLintCommand(cli: CAC): void {
  cli
    .command(
      "lint [expression]",
      "Lint an expression.md for schema correctness and body/frontmatter drift",
    )
    .option("--json", "Emit JSON report to stdout")
    .option("--strict <rules>", "Treat comma-separated rules as errors")
    .option("--off <rules>", "Silence comma-separated rules")
    .action(async (expressionArg: string | undefined, opts) => {
      try {
        const path = resolve(process.cwd(), expressionArg || "expression.md");
        const raw = await readFile(path, "utf-8");
        const strict = parseList(opts.strict);
        const off = parseList(opts.off);
        const report = lintExpression(raw, { strict, off });

        if (opts.json) {
          process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
        } else {
          process.stdout.write(formatReportCLI(path, report));
        }

        process.exit(report.errors > 0 ? 1 : 0);
      } catch (err) {
        console.error(
          `Error: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exit(2);
      }
    });
}

function parseList(raw: unknown): string[] | undefined {
  if (typeof raw !== "string" || raw.length === 0) return undefined;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function severityTag(s: LintSeverity): string {
  if (s === "error") return "error  ";
  if (s === "warning") return "warning";
  return "info   ";
}

function formatReportCLI(path: string, report: LintReport): string {
  if (report.issues.length === 0) {
    return `✓ ${path} — clean\n`;
  }
  const header = `${path}\n`;
  const lines = report.issues.map((i) => {
    const loc = i.path ? ` (${i.path})` : "";
    return `  ${severityTag(i.severity)}  [${i.rule}]  ${i.message}${loc}`;
  });
  const summary = `\n${report.errors} error${report.errors === 1 ? "" : "s"}, ${report.warnings} warning${report.warnings === 1 ? "" : "s"}, ${report.info} info\n`;
  return `${header}${lines.join("\n")}${summary}`;
}
