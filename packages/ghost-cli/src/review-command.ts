import {
  formatGitHubPRComments,
  formatReviewCLI,
  formatReviewJSON,
  formatReviewSummary,
  review,
} from "@ghost/core";
import type { CAC } from "cac";

export function registerReviewCommand(cli: CAC): void {
  cli
    .command(
      "review [files]",
      "Review files for visual language drift against a design fingerprint",
    )
    .option(
      "-f, --fingerprint <path>",
      "Path to fingerprint JSON (default: .ghost-fingerprint.json)",
    )
    .option("--staged", "Review staged changes only")
    .option("-b, --base <ref>", "Base ref for git diff (default: HEAD)")
    .option(
      "--format <fmt>",
      "Output format: cli, json, github (default: cli)",
      {
        default: "cli",
      },
    )
    .option(
      "--dimensions <list>",
      "Comma-separated dimensions to check: palette,spacing,typography,surfaces",
    )
    .option("--all", "Report issues on all lines, not just changed lines")
    .action(async (filesArg: string | undefined, opts) => {
      try {
        // Parse dimensions flag
        let dimensions: Record<string, boolean> | undefined;
        if (opts.dimensions) {
          dimensions = {};
          for (const d of String(opts.dimensions).split(",")) {
            const dim = d.trim();
            if (
              dim === "palette" ||
              dim === "spacing" ||
              dim === "typography" ||
              dim === "surfaces"
            ) {
              dimensions[dim] = true;
            }
          }
          for (const d of ["palette", "spacing", "typography", "surfaces"]) {
            if (!dimensions[d]) dimensions[d] = false;
          }
        }

        const files =
          filesArg && typeof filesArg === "string"
            ? filesArg
                .split(",")
                .map((f) => f.trim())
                .filter(Boolean)
            : undefined;

        const report = await review({
          files: files && files.length > 0 ? files : undefined,
          diff:
            !files || files.length === 0
              ? {
                  base: opts.base as string | undefined,
                  staged: Boolean(opts.staged),
                }
              : undefined,
          fingerprintPath: opts.fingerprint as string | undefined,
          config: {
            dimensions,
            changedLinesOnly: !opts.all,
          },
        });

        let output: string;
        switch (opts.format) {
          case "json":
            output = formatReviewJSON(report);
            break;
          case "github": {
            const comments = formatGitHubPRComments(report);
            const summary = formatReviewSummary(report);
            output = JSON.stringify({ summary, comments }, null, 2);
            break;
          }
          default:
            output = formatReviewCLI(report);
        }

        process.stdout.write(`${output}\n`);
        process.exit(report.summary.errors > 0 ? 1 : 0);
      } catch (err) {
        console.error(
          `Error: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exit(2);
      }
    });
}
