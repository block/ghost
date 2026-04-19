import { resolve } from "node:path";
import { loadExpression, writeContextBundle } from "@ghost/core";
import type { CAC } from "cac";

export function registerContextCommand(cli: CAC): void {
  cli
    .command(
      "context [expression]",
      "Emit a grounding skill bundle from an expression (for downstream generators)",
    )
    .option("-o, --out <dir>", "Output directory (default: ./ghost-context)")
    .option("--no-tokens", "Skip tokens.css output")
    .option("--readme", "Include README.md")
    .option(
      "--prompt-only",
      "Emit only prompt.md (skips SKILL.md / expression.md / tokens.css)",
    )
    .option(
      "--name <name>",
      "Override the skill name (default: fingerprint id)",
    )
    .action(async (expressionArg: string | undefined, opts) => {
      try {
        const expressionPath = resolve(
          process.cwd(),
          expressionArg || "expression.md",
        );
        const outDir = resolve(
          process.cwd(),
          (opts.out as string | undefined) ?? "ghost-context",
        );

        const { fingerprint } = await loadExpression(expressionPath);
        const result = await writeContextBundle(fingerprint, {
          outDir,
          tokens: opts.tokens !== false,
          readme: Boolean(opts.readme),
          promptOnly: Boolean(opts.promptOnly),
          name: opts.name as string | undefined,
          sourcePath: expressionPath,
        });

        process.stdout.write(
          `Wrote ${result.files.length} file${result.files.length === 1 ? "" : "s"} to ${result.outDir}:\n`,
        );
        for (const f of result.files) {
          process.stdout.write(`  ${f}\n`);
        }
        process.exit(0);
      } catch (err) {
        console.error(
          `Error: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exit(2);
      }
    });
}
