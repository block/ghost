import { resolve } from "node:path";
import {
  compareExpressions,
  formatSemanticDiff,
  loadExpression,
} from "@ghost/core";
import type { CAC } from "cac";

export function registerExprDiffCommand(cli: CAC): void {
  cli
    .command(
      "expr-diff <a> <b>",
      "Semantic diff between two expressions (decisions, values, palette, tokens)",
    )
    .option("--json", "Emit JSON diff to stdout")
    .action(async (a: string, b: string, opts) => {
      try {
        const aPath = resolve(process.cwd(), a);
        const bPath = resolve(process.cwd(), b);
        const [aParsed, bParsed] = await Promise.all([
          loadExpression(aPath),
          loadExpression(bPath),
        ]);
        const diff = compareExpressions(
          aParsed.fingerprint,
          bParsed.fingerprint,
        );

        if (opts.json) {
          process.stdout.write(`${JSON.stringify(diff, null, 2)}\n`);
        } else {
          process.stdout.write(formatSemanticDiff(diff));
        }

        process.exit(diff.unchanged ? 0 : 1);
      } catch (err) {
        console.error(
          `Error: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exit(2);
      }
    });
}
