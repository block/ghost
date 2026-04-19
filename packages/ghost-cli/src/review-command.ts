import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { DesignFingerprint } from "@ghost/core";
import {
  Director,
  formatComplianceCLI,
  formatComplianceJSON,
  formatComplianceSARIF,
  formatGitHubPRComments,
  formatReviewCLI,
  formatReviewJSON,
  formatReviewSummary,
  formatVerifyCLI,
  loadConfig,
  loadExpression,
  loadPromptSuite,
  resolveTarget,
  review,
  verify,
} from "@ghost/core";
import type { CAC } from "cac";

const SCOPES = new Set(["files", "project", "suite"]);
export type ReviewScope = "files" | "project" | "suite";

/**
 * Parse the positional args to determine scope + remaining positionals.
 * First arg is treated as scope if it matches files|project|suite; otherwise
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
      "Check drift against expression.md. Scopes: files (default) | project | suite",
    )
    // files scope
    .option(
      "-f, --fingerprint <path>",
      "Source expression path (default: ./expression.md, with fallback to legacy .ghost-fingerprint.json)",
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
    // suite scope
    .option(
      "--suite <path>",
      "Path to a prompt suite JSON (suite scope, default: bundled v0.1)",
    )
    .option(
      "-n, --n <count>",
      "Subsample first N prompts (suite scope, default: run all)",
    )
    .option(
      "--concurrency <n>",
      "Max in-flight generate+review calls (suite scope, default: 3)",
      { default: "3" },
    )
    .option(
      "--retries <n>",
      "Self-review retries per prompt (suite scope, default: 1)",
      { default: "1" },
    )
    .option(
      "-o, --out <file>",
      "Write report to file (suite scope, default: stdout)",
    )
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

        if (scope === "suite") {
          await runSuite(positional, opts);
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
    fingerprintPath: opts.fingerprint,
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

  let parentFingerprint: DesignFingerprint | undefined;
  if (opts.against) {
    parentFingerprint = (await loadExpression(opts.against)).fingerprint;
  }

  const director = new Director();
  const { fingerprint, compliance } = await director.comply(
    resolvedTarget,
    {
      parentFingerprint,
      thresholds: {
        maxOverallDrift: Number.parseFloat(String(opts.maxDrift)),
      },
    },
    {
      // biome-ignore lint/suspicious/noExplicitAny: mirror the pre-merge comply handler
      llm: config.llm ?? (undefined as any),
      embedding: config.embedding,
      verbose: opts.verbose,
    },
  );

  if (opts.verbose) {
    console.log(`Profiled ${resolvedTarget.type}: ${resolvedTarget.value}`);
    console.log(`Confidence: ${fingerprint.confidence.toFixed(2)}`);
    console.log();
  }

  let output: string;
  if (opts.format === "sarif") {
    output = formatComplianceSARIF(compliance.data);
  } else if (opts.format === "json") {
    output = formatComplianceJSON(compliance.data);
  } else {
    output = formatComplianceCLI(compliance.data);
  }

  process.stdout.write(`${output}\n`);
  process.exit(compliance.data.passed ? 0 : 1);
}

// --- suite scope (prompt-suite verification, was `verify`) ---

async function runSuite(positional: string[], opts: ReviewOpts): Promise<void> {
  const expressionPath = resolve(
    process.cwd(),
    positional[0] || "expression.md",
  );
  const { fingerprint } = await loadExpression(expressionPath);
  const suite = await loadPromptSuite(opts.suite);
  const concurrency = Number.parseInt(String(opts.concurrency ?? "3"), 10);
  const retries = Number.parseInt(String(opts.retries ?? "1"), 10);
  const n = opts.n ? Number.parseInt(String(opts.n), 10) : undefined;

  const total =
    n !== undefined && n > 0
      ? Math.min(n, suite.prompts.length)
      : suite.prompts.length;

  process.stderr.write(
    `Running ${total} prompt${total === 1 ? "" : "s"} at concurrency ${concurrency}…\n`,
  );

  const result = await verify({
    fingerprint,
    suite,
    n,
    concurrency,
    retries,
    onProgress: (p, done) => {
      const status = p.passed ? "✓" : "✗";
      process.stderr.write(
        `  [${done}/${total}] ${status} ${p.id} (${(p.durationMs / 1000).toFixed(1)}s)\n`,
      );
    },
  });

  if (opts.out) {
    const outPath = resolve(process.cwd(), opts.out);
    await writeFile(outPath, JSON.stringify(result, null, 2), "utf-8");
    process.stderr.write(`Report written to ${outPath}\n`);
  }

  if (opts.format === "json") {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    process.stdout.write(
      `${formatVerifyCLI(result, { showPrompts: opts.verbose })}\n`,
    );
  }

  process.exit(result.failed > 0 ? 1 : 0);
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
  fingerprint?: string;
  staged?: boolean;
  base?: string;
  dimensions?: string;
  all?: boolean;
  // project
  against?: string;
  maxDrift?: string;
  config?: string;
  // suite
  suite?: string;
  n?: string;
  concurrency?: string;
  retries?: string;
  out?: string;
  // shared
  format?: string;
  verbose?: boolean;
}
