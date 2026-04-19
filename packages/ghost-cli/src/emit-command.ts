import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { emitReviewCommand, loadExpression } from "@ghost/core";
import type { CAC } from "cac";

const DEFAULT_EXPRESSION = "expression.md";
const DEFAULT_REVIEW_OUT = ".claude/commands/design-review.md";

export function registerEmitCommand(cli: CAC): void {
  cli
    .command(
      "emit <kind>",
      "Emit a derived artifact from expression.md (kinds: review)",
    )
    .option(
      "-e, --expression <path>",
      `Source expression file (default: ${DEFAULT_EXPRESSION})`,
    )
    .option(
      "-o, --out <path>",
      `Output path (default for review: ${DEFAULT_REVIEW_OUT})`,
    )
    .option("--stdout", "Write to stdout instead of a file")
    .action(async (kind: string, opts) => {
      try {
        if (kind !== "review") {
          console.error(
            `Error: unknown emit kind '${kind}'. Supported: review`,
          );
          process.exit(2);
        }

        const expressionPath = resolve(
          process.cwd(),
          opts.expression ?? DEFAULT_EXPRESSION,
        );
        const parsed = await loadExpression(expressionPath, {
          noEmbeddingBackfill: true,
        });
        const content = emitReviewCommand({ fingerprint: parsed.fingerprint });

        if (opts.stdout) {
          process.stdout.write(content);
          process.exit(0);
        }

        const outPath = resolve(process.cwd(), opts.out ?? DEFAULT_REVIEW_OUT);
        await mkdir(dirname(outPath), { recursive: true });
        await writeFile(outPath, content, "utf-8");
        console.log(`Wrote ${outPath}`);
        process.exit(0);
      } catch (err) {
        console.error(
          `Error: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exit(2);
      }
    });
}
