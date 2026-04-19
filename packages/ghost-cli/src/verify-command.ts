import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  formatVerifyCLI,
  loadExpression,
  loadPromptSuite,
  verify,
} from "@ghost/core";
import type { CAC } from "cac";

/**
 * `ghost verify` — run the bundled prompt suite through generate→review
 * against an expression. Previously `ghost review suite`, pulled out
 * because the inputs (one expression, suite config) and outputs (aggregate)
 * share nothing with the code-drift review path.
 */
export function registerVerifyCommand(cli: CAC): void {
  cli
    .command(
      "verify [expression]",
      "Run the prompt suite against an expression and report per-dimension drift",
    )
    .option(
      "--suite <path>",
      "Path to a prompt suite JSON (default: bundled v0.1)",
    )
    .option("-n, --n <count>", "Subsample first N prompts (default: run all)")
    .option(
      "--concurrency <n>",
      "Max in-flight generate+review calls (default: 3)",
      { default: "3" },
    )
    .option("--retries <n>", "Self-review retries per prompt (default: 1)", {
      default: "1",
    })
    .option("-o, --out <file>", "Write report to file (default: stdout)")
    .option("--format <fmt>", "Output format: cli or json", { default: "cli" })
    .option("-v, --verbose", "Verbose output")
    .action(async (expressionArg: string | undefined, opts) => {
      try {
        const expressionPath = resolve(
          process.cwd(),
          expressionArg || "expression.md",
        );
        const { expression } = await loadExpression(expressionPath);
        const suite = await loadPromptSuite(opts.suite);
        const concurrency = Number.parseInt(
          String(opts.concurrency ?? "3"),
          10,
        );
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
          expression,
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
      } catch (err) {
        console.error(
          `Error: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exit(2);
      }
    });
}
