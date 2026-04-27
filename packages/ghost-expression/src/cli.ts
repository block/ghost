import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { cac } from "cac";
import {
  diffExpressions,
  EXPRESSION_FILENAME,
  formatLayout,
  formatSemanticDiff,
  layoutExpression,
  lintExpression,
  loadExpression,
} from "./core/index.js";
import { registerEmitCommand } from "./emit-command.js";

export { registerEmitCommand } from "./emit-command.js";

/**
 * Build the cac CLI for `ghost-expression`.
 *
 * Four deterministic verbs author and validate `expression.md`:
 * `lint` (schema check), `describe` (section ranges + token estimates),
 * `diff` (structural prose-level diff between two expressions), and
 * `emit` (derive review-command, context-bundle, or skill artifacts).
 *
 * Embedding-based comparison lives in `ghost-drift`. `diff` here is
 * text/structural — what decisions and palette roles changed — not
 * vector distance.
 */
export function buildCli(): ReturnType<typeof cac> {
  const cli = cac("ghost-expression");

  // --- lint ---
  cli
    .command(
      "lint [expression]",
      "Validate expression.md schema and body/frontmatter coherence",
    )
    .option("--format <fmt>", "Output format: cli or json", { default: "cli" })
    .action(async (path: string | undefined, opts) => {
      try {
        const target = resolve(process.cwd(), path ?? EXPRESSION_FILENAME);
        const raw = await readFile(target, "utf-8");
        const report = lintExpression(raw);

        if (opts.format === "json") {
          process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
        } else {
          for (const issue of report.issues) {
            const prefix =
              issue.severity === "error"
                ? "ERROR"
                : issue.severity === "warning"
                  ? "WARN "
                  : "INFO ";
            const pathSuffix = issue.path ? ` @ ${issue.path}` : "";
            process.stdout.write(
              `${prefix} [${issue.rule}] ${issue.message}${pathSuffix}\n`,
            );
          }
          process.stdout.write(
            `\n${report.errors} error(s), ${report.warnings} warning(s), ${report.info} info\n`,
          );
        }

        process.exit(report.errors > 0 ? 1 : 0);
      } catch (err) {
        console.error(
          `Error: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exit(2);
      }
    });

  // --- describe ---
  cli
    .command(
      "describe [expression]",
      "Print a section map of expression.md (line ranges + token estimates) so agents can selectively load only the sections they need.",
    )
    .option("--format <fmt>", "Output format: cli or json", { default: "cli" })
    .action(async (path: string | undefined, opts) => {
      try {
        const target = resolve(process.cwd(), path ?? EXPRESSION_FILENAME);
        const raw = await readFile(target, "utf-8");
        const layout = layoutExpression(raw);
        if (opts.format === "json") {
          process.stdout.write(
            `${JSON.stringify({ path: target, ...layout }, null, 2)}\n`,
          );
        } else {
          process.stdout.write(`${formatLayout(layout, target)}\n`);
        }
        process.exit(0);
      } catch (err) {
        console.error(
          `Error: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exit(2);
      }
    });

  // --- diff ---
  cli
    .command(
      "diff <a> <b>",
      "Structural diff between two expression.md files — what decisions, palette roles, and tokens changed (text-level, NOT embedding distance; for that, use `ghost-drift compare`).",
    )
    .option("--format <fmt>", "Output format: cli or json", { default: "cli" })
    .action(async (a: string, b: string, opts) => {
      try {
        const [{ expression: exprA }, { expression: exprB }] =
          await Promise.all([
            loadExpression(resolve(process.cwd(), a), {
              noEmbeddingBackfill: true,
            }),
            loadExpression(resolve(process.cwd(), b), {
              noEmbeddingBackfill: true,
            }),
          ]);
        const diff = diffExpressions(exprA, exprB);
        if (opts.format === "json") {
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

  registerEmitCommand(cli);

  cli.help();
  cli.version(readPackageVersion());

  return cli;
}

function readPackageVersion(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const pkg = JSON.parse(
    readFileSync(resolve(here, "../package.json"), "utf8"),
  );
  return pkg.version as string;
}
