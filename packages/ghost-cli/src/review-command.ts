import type { Expression } from "@ghost/core";
import {
  comply,
  formatComplianceCLI,
  formatComplianceJSON,
  formatComplianceSARIF,
  formatGitHubPRComments,
  formatReviewCLI,
  formatReviewJSON,
  formatReviewSummary,
  loadConfig,
  loadExpression,
  profileTargets,
  resolveTarget,
  review,
} from "@ghost/core";
import type { CAC } from "cac";

const SCOPES = new Set(["files", "project"]);
export type ReviewScope = "files" | "project";

/**
 * Parse the positional args to determine scope + remaining positionals.
 * First arg is treated as scope if it matches files|project; otherwise
 * everything is treated as files-scope positionals (code paths to review).
 * Exported for unit testing.
 */
export function parseScope(args: string[]): {
  scope: ReviewScope;
  positional: string[];
} {
  const first = args[0];
  if (first && SCOPES.has(first)) {
    return { scope: first as ReviewScope, positional: args.slice(1) };
  }
  return { scope: "files", positional: args };
}

export function registerReviewCommand(cli: CAC): void {
  cli
    .command(
      "review [...args]",
      "Check drift against expression.md. Scopes: files (default) | project",
    )
    // files scope
    .option(
      "-e, --expression <path>",
      "Source expression path (default: ./expression.md)",
    )
    .option("--staged", "Review staged changes only (files scope)")
    .option(
      "-b, --base <ref>",
      "Base ref for git diff (files scope, default: HEAD)",
    )
    .option(
      "--dimensions <list>",
      "Comma-separated dimensions to check (files scope): palette,spacing,typography,surfaces",
    )
    .option(
      "--all",
      "Report issues on all lines, not just changed lines (files scope)",
    )
    // project scope
    .option(
      "--against <path>",
      "Parent expression to check drift against (project scope)",
    )
    .option(
      "--max-drift <n>",
      "Maximum overall drift distance (project scope, default: 0.3)",
      { default: "0.3" },
    )
    .option("-c, --config <path>", "Path to ghost config file (project scope)")
    // shared
    .option(
      "--format <fmt>",
      "Output format: cli (default), json, github (files only), sarif (project only)",
      { default: "cli" },
    )
    .option("-v, --verbose", "Verbose output")
    .action(async (args: string[], opts) => {
      try {
        const { scope, positional } = parseScope(args);

        if (scope === "project") {
          await runProject(positional, opts);
          return;
        }

        await runFiles(positional, opts);
      } catch (err) {
        console.error(
          `Error: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exit(2);
      }
    });
}

// --- files scope (code drift in files) ---

async function runFiles(positional: string[], opts: ReviewOpts): Promise<void> {
  const files = positional.length > 0 ? positional : undefined;

  const dimensions = parseDimensions(opts.dimensions);

  const report = await review({
    files,
    diff: files
      ? undefined
      : {
          base: opts.base,
          staged: Boolean(opts.staged),
        },
    expressionPath: opts.expression,
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
}

// --- project scope (target-level compliance, was `comply`) ---

async function runProject(
  positional: string[],
  opts: ReviewOpts,
): Promise<void> {
  const config = await loadConfig(opts.config);
  const targetStr = positional[0] ?? ".";
  const resolvedTarget = resolveTarget(targetStr);

  let parentExpression: Expression | undefined;
  if (opts.against) {
    parentExpression = (await loadExpression(opts.against)).expression;
  }

  const profiled = await profileTargets([resolvedTarget], config);

  const compliance = comply({
    expression: profiled.expression,
    parentExpression,
    thresholds: {
      maxOverallDrift: Number.parseFloat(String(opts.maxDrift)),
    },
  });

  if (opts.verbose) {
    console.log(`Profiled ${resolvedTarget.type}: ${resolvedTarget.value}`);
    console.log(`Confidence: ${profiled.confidence.toFixed(2)}`);
    console.log();
  }

  let output: string;
  if (opts.format === "sarif") {
    output = formatComplianceSARIF(compliance);
  } else if (opts.format === "json") {
    output = formatComplianceJSON(compliance);
  } else {
    output = formatComplianceCLI(compliance);
  }

  process.stdout.write(`${output}\n`);
  process.exit(compliance.passed ? 0 : 1);
}

// --- helpers ---

function parseDimensions(raw: unknown): Record<string, boolean> | undefined {
  if (typeof raw !== "string" || raw.length === 0) return undefined;
  const dims: Record<string, boolean> = {};
  for (const d of raw.split(",")) {
    const dim = d.trim();
    if (
      dim === "palette" ||
      dim === "spacing" ||
      dim === "typography" ||
      dim === "surfaces"
    ) {
      dims[dim] = true;
    }
  }
  for (const d of ["palette", "spacing", "typography", "surfaces"]) {
    if (!dims[d]) dims[d] = false;
  }
  return dims;
}

interface ReviewOpts {
  // files
  expression?: string;
  staged?: boolean;
  base?: string;
  dimensions?: string;
  all?: boolean;
  // project
  against?: string;
  maxDrift?: string;
  config?: string;
  // shared
  format?: string;
  verbose?: boolean;
}
