import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { generate, loadExpression } from "@ghost/core";
import type { CAC } from "cac";

export function registerGenerateCommand(cli: CAC): void {
  cli
    .command(
      "generate <prompt>",
      "Generate a UI artifact from an expression (reference generator)",
    )
    .option(
      "-e, --expression <path>",
      "Path to expression.md (default: ./expression.md)",
    )
    .option("-o, --out <file>", "Write artifact to file (default: stdout)")
    .option("--format <fmt>", "Output format: html (default: html)", {
      default: "html",
    })
    .option(
      "--retries <n>",
      "Max self-review retries after initial attempt (default: 2, max 3)",
      { default: "2" },
    )
    .option("--no-review", "Skip self-review gate (faster, drift-blind)")
    .option("--json", "Emit structured JSON {artifact, attempts, passed}")
    .action(async (userPrompt: string, opts) => {
      try {
        const expressionPath = resolve(
          process.cwd(),
          (opts.expression as string | undefined) ?? "expression.md",
        );
        const fingerprint = await loadExpression(expressionPath);
        const format = (opts.format as string) ?? "html";
        if (format !== "html") {
          throw new Error(
            `Invalid --format '${format}'. Only 'html' is supported in this phase.`,
          );
        }
        const retries = Number.parseInt(String(opts.retries ?? "2"), 10);
        if (!Number.isFinite(retries) || retries < 0) {
          throw new Error(`Invalid --retries '${opts.retries}'.`);
        }

        const result = await generate({
          fingerprint,
          userPrompt,
          format: "html",
          selfReview: opts.review !== false,
          retries,
        });

        if (opts.json) {
          process.stdout.write(
            `${JSON.stringify(
              {
                passed: result.passed,
                attempts: result.attempts.map((a) => ({
                  attempt: a.attempt,
                  errors: a.reviewReport?.summary.errors ?? 0,
                  warnings: a.reviewReport?.summary.warnings ?? 0,
                  byDimension: a.reviewReport?.summary.byDimension ?? {},
                })),
                artifact: result.artifact,
              },
              null,
              2,
            )}\n`,
          );
        } else if (opts.out) {
          const outPath = resolve(process.cwd(), opts.out as string);
          await writeFile(outPath, result.artifact, "utf-8");
          const summary = result.reviewReport?.summary;
          process.stdout.write(
            `Wrote ${outPath} — ${result.attempts.length} attempt${result.attempts.length === 1 ? "" : "s"}, ${
              result.passed ? "passed" : "failed"
            } review${summary ? ` (${summary.errors} errors, ${summary.warnings} warnings)` : ""}\n`,
          );
        } else {
          process.stdout.write(`${result.artifact}\n`);
        }

        process.exit(result.passed ? 0 : 1);
      } catch (err) {
        console.error(
          `Error: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exit(2);
      }
    });
}
