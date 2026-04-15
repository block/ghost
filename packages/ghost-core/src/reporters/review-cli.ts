import type { ReviewFileResult, ReviewIssue, ReviewReport } from "../types.js";

const useColor =
  !process.env.NO_COLOR &&
  !process.argv.includes("--no-color") &&
  process.stdout.isTTY;

const c = {
  red: (s: string) => (useColor ? `\x1b[31m${s}\x1b[0m` : s),
  yellow: (s: string) => (useColor ? `\x1b[33m${s}\x1b[0m` : s),
  green: (s: string) => (useColor ? `\x1b[32m${s}\x1b[0m` : s),
  cyan: (s: string) => (useColor ? `\x1b[36m${s}\x1b[0m` : s),
  magenta: (s: string) => (useColor ? `\x1b[35m${s}\x1b[0m` : s),
  dim: (s: string) => (useColor ? `\x1b[2m${s}\x1b[0m` : s),
  bold: (s: string) => (useColor ? `\x1b[1m${s}\x1b[0m` : s),
};

function severityTag(severity: string): string {
  switch (severity) {
    case "error":
      return c.red("ERROR");
    case "warning":
      return c.yellow(" WARN");
    default:
      return c.cyan(" INFO");
  }
}

function dimensionBadge(dimension: string): string {
  switch (dimension) {
    case "palette":
      return c.magenta("palette");
    case "spacing":
      return c.cyan("spacing");
    case "typography":
      return c.green("typography");
    case "surfaces":
      return c.yellow("surfaces");
    default:
      return dimension;
  }
}

function formatIssue(issue: ReviewIssue): string {
  const lines: string[] = [];
  const location = `${issue.file}:${issue.line}`;

  lines.push(
    `  ${severityTag(issue.severity)}  ${dimensionBadge(issue.dimension)}  ${c.dim(location)}`,
  );
  lines.push(`         ${issue.message}`);

  if (issue.found && issue.nearest) {
    lines.push(
      `         ${c.dim("found:")} ${issue.found}  ${c.dim("→")}  ${issue.nearest}${issue.nearestRole ? c.dim(` (${issue.nearestRole})`) : ""}`,
    );
  }

  if (issue.fix) {
    lines.push(`         ${c.dim("fix:")} ${issue.fix.description}`);
  }

  return lines.join("\n");
}

function formatFile(fileResult: ReviewFileResult): string {
  if (fileResult.issues.length === 0) return "";

  const lines: string[] = [];
  lines.push(c.bold(fileResult.file));
  for (const issue of fileResult.issues) {
    lines.push(formatIssue(issue));
  }
  return lines.join("\n");
}

export function formatReviewCLI(report: ReviewReport): string {
  const lines: string[] = [];
  const { summary } = report;

  // Header
  lines.push("");
  lines.push(
    c.bold("Ghost Design Review") +
      c.dim(` — against fingerprint ${report.fingerprint}`),
  );
  lines.push("");

  // Files with issues
  const filesWithIssues = report.files.filter((f) => f.issues.length > 0);

  if (filesWithIssues.length === 0) {
    lines.push(c.green("  No design drift detected."));
    lines.push("");
    lines.push(
      c.dim(`  Scanned ${summary.filesScanned} files against fingerprint.`),
    );
    lines.push("");
    return lines.join("\n");
  }

  for (const file of filesWithIssues) {
    lines.push(formatFile(file));
    lines.push("");
  }

  // Summary
  lines.push(c.dim("─".repeat(60)));

  const parts: string[] = [];
  if (summary.errors > 0) parts.push(c.red(`${summary.errors} errors`));
  if (summary.warnings > 0)
    parts.push(c.yellow(`${summary.warnings} warnings`));
  if (summary.fixesAvailable > 0)
    parts.push(c.dim(`${summary.fixesAvailable} fixes available`));

  lines.push(
    `  ${summary.totalIssues} issues in ${summary.filesWithIssues}/${summary.filesScanned} files — ${parts.join(", ")}`,
  );

  // Per-dimension breakdown
  const dimParts: string[] = [];
  for (const [dim, count] of Object.entries(summary.byDimension)) {
    dimParts.push(`${dimensionBadge(dim)}: ${count}`);
  }
  if (dimParts.length > 0) {
    lines.push(`  ${dimParts.join("  ")}`);
  }

  lines.push(c.dim(`  ${report.duration}ms`));
  lines.push("");

  return lines.join("\n");
}
