import { resolve } from "node:path";
import type { ContextFormat } from "@ghost/core";
import { loadExpression, writeContextBundle } from "@ghost/core";
import type { CAC } from "cac";

export function registerContextCommand(cli: CAC): void {
  cli
    .command(
      "context [expression]",
      "Emit a grounding skill bundle from an expression (for downstream generators)",
    )
    .option("-o, --out <dir>", "Output directory (default: ./ghost-context)")
    .option(
      "--format <fmt>",
      "Output format: skill | prompt | bundle (default: skill)",
      { default: "skill" },
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
        const format = (opts.format as string) ?? "skill";
        if (format !== "skill" && format !== "prompt" && format !== "bundle") {
          throw new Error(
            `Invalid --format '${format}'. Use skill, prompt, or bundle.`,
          );
        }

        const fingerprint = await loadExpression(expressionPath);
        const result = await writeContextBundle(fingerprint, {
          outDir,
          format: format as ContextFormat,
          name: opts.name as string | undefined,
        });

        process.stdout.write(
          `Wrote ${result.files.length} file${result.files.length === 1 ? "" : "s"} (format: ${result.format}) to ${result.outDir}:\n`,
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
