import type { ComplianceReport } from "../review/comply.js";

const SEVERITY_ICONS: Record<string, string> = {
  error: "\x1b[31m✖\x1b[0m",
  warning: "\x1b[33m⚠\x1b[0m",
  info: "\x1b[36mℹ\x1b[0m",
};

export function formatComplianceCLI(report: ComplianceReport): string {
  const lines: string[] = [];

  const status = report.passed
    ? "\x1b[32m✓ PASSED\x1b[0m"
    : "\x1b[31m✖ FAILED\x1b[0m";

  lines.push(`\x1b[1mCompliance Report\x1b[0m  ${status}`);
  lines.push(`Score: ${(report.score * 100).toFixed(0)}%`);
  lines.push("");

  if (report.driftSummary) {
    lines.push("\x1b[1mDrift from parent\x1b[0m");
    lines.push(
      `  Distance: ${report.driftSummary.distance.toFixed(3)} (${report.driftSummary.classification})`,
    );

    const dims = Object.entries(report.driftSummary.dimensions)
      .filter(([_, d]) => d > 0.05)
      .sort(([, a], [, b]) => b - a);

    for (const [dim, dist] of dims) {
      const bar = "█".repeat(Math.round(dist * 20));
      lines.push(`  ${dim.padEnd(14)} ${dist.toFixed(3)} ${bar}`);
    }
    lines.push("");
  }

  if (report.violations.length === 0) {
    lines.push("No violations found.");
  } else {
    lines.push(`\x1b[1mViolations\x1b[0m (${report.violations.length})`);
    lines.push("");

    for (const v of report.violations) {
      const icon = SEVERITY_ICONS[v.severity] ?? "•";
      const dimTag = v.dimension ? ` \x1b[2m[${v.dimension}]\x1b[0m` : "";
      lines.push(`  ${icon} ${v.rule}${dimTag}`);
      lines.push(`    ${v.message}`);
      if (v.suggestion) {
        lines.push(`    \x1b[2m→ ${v.suggestion}\x1b[0m`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

export function formatComplianceJSON(report: ComplianceReport): string {
  return JSON.stringify(report, null, 2);
}

/**
 * Format compliance report as SARIF (Static Analysis Results Interchange Format).
 * Suitable for GitHub Actions / CI integration.
 */
export function formatComplianceSARIF(report: ComplianceReport): string {
  const sarif = {
    $schema:
      "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/main/sarif-2.1/schema/sarif-schema-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: "ghost",
            version: "0.2.0",
            informationUri: "https://github.com/ghost/ghost",
            rules: report.violations.map((v) => ({
              id: v.rule,
              shortDescription: { text: v.message },
              defaultConfiguration: {
                level:
                  v.severity === "error"
                    ? "error"
                    : v.severity === "warning"
                      ? "warning"
                      : "note",
              },
            })),
          },
        },
        results: report.violations.map((v) => ({
          ruleId: v.rule,
          level:
            v.severity === "error"
              ? "error"
              : v.severity === "warning"
                ? "warning"
                : "note",
          message: {
            text: v.suggestion
              ? `${v.message}\n\nSuggestion: ${v.suggestion}`
              : v.message,
          },
          properties: {
            dimension: v.dimension,
            value: v.value,
          },
        })),
      },
    ],
  };

  return JSON.stringify(sarif, null, 2);
}
