import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  emitReviewCommand,
  loadExpression,
  writeContextBundle,
} from "@ghost/core";
import type { CAC } from "cac";

const DEFAULT_EXPRESSION = "expression.md";
const DEFAULT_REVIEW_OUT = ".claude/commands/design-review.md";
const DEFAULT_CONTEXT_OUT = "ghost-context";

const SUPPORTED_KINDS = ["review-command", "context-bundle"] as const;
type Kind = (typeof SUPPORTED_KINDS)[number];

export function registerEmitCommand(cli: CAC): void {
  cli
    .command(
      "emit <kind>",
      `Emit a derived artifact from expression.md (kinds: ${SUPPORTED_KINDS.join(", ")})`,
    )
    .option(
      "-e, --expression <path>",
      `Source expression file (default: ${DEFAULT_EXPRESSION})`,
    )
    .option(
      "-o, --out <path>",
      `Output path (review-command → ${DEFAULT_REVIEW_OUT}; context-bundle → ${DEFAULT_CONTEXT_OUT}/)`,
    )
    .option(
      "--stdout",
      "Write to stdout instead of a file (review-command only)",
    )
    // context-bundle flags:
    .option("--no-tokens", "Skip tokens.css output (context-bundle)")
    .option("--readme", "Include README.md (context-bundle)")
    .option(
      "--prompt-only",
      "Emit only prompt.md — skips SKILL.md / expression.md / tokens.css (context-bundle)",
    )
    .option(
      "--name <name>",
      "Override the skill name (default: fingerprint id) (context-bundle)",
    )
    .action(async (kind: string, opts) => {
      try {
        if (!SUPPORTED_KINDS.includes(kind as Kind)) {
          console.error(
            `Error: unknown emit kind '${kind}'. Supported: ${SUPPORTED_KINDS.join(", ")}`,
          );
          process.exit(2);
        }

        const expressionPath = resolve(
          process.cwd(),
          opts.expression ?? DEFAULT_EXPRESSION,
        );

        if (kind === "review-command") {
          const parsed = await loadExpression(expressionPath, {
            noEmbeddingBackfill: true,
          });
          const content = emitReviewCommand({
            fingerprint: parsed.fingerprint,
          });

          if (opts.stdout) {
            process.stdout.write(content);
            process.exit(0);
          }

          const outPath = resolve(
            process.cwd(),
            opts.out ?? DEFAULT_REVIEW_OUT,
          );
          await mkdir(dirname(outPath), { recursive: true });
          await writeFile(outPath, content, "utf-8");
          console.log(`Wrote ${outPath}`);
          process.exit(0);
        }

        // kind === "context-bundle"
        const outDir = resolve(
          process.cwd(),
          (opts.out as string | undefined) ?? DEFAULT_CONTEXT_OUT,
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
          `Wrote ${result.files.length} file${
            result.files.length === 1 ? "" : "s"
          } to ${result.outDir}:\n`,
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
