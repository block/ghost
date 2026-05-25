import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { CAC } from "cac";
import {
  emitReviewCommand,
  loadFingerprint,
  resolveFingerprintPackage,
  writeContextBundle,
  writePackageContextBundle,
} from "./scan/index.js";

const DEFAULT_REVIEW_OUT = ".claude/commands/design-review.md";
const DEFAULT_CONTEXT_OUT = "ghost-context";

export const SUPPORTED_KINDS = ["review-command", "context-bundle"] as const;
export type EmitKind = (typeof SUPPORTED_KINDS)[number];

export type ParseEmitKindResult =
  | { ok: true; kind: EmitKind }
  | { ok: false; error: string };

/**
 * Validate the positional emit kind against the supported set.
 * Exported for unit testing.
 */
export function parseEmitKind(raw: string): ParseEmitKindResult {
  if ((SUPPORTED_KINDS as readonly string[]).includes(raw)) {
    return { ok: true, kind: raw as EmitKind };
  }
  return {
    ok: false,
    error: `unknown emit kind '${raw}'. Supported: ${SUPPORTED_KINDS.join(", ")}`,
  };
}

export function registerEmitCommand(cli: CAC): void {
  cli
    .command(
      "emit <kind>",
      `Emit a derived artifact from the fingerprint package (kinds: ${SUPPORTED_KINDS.join(", ")})`,
    )
    .option(
      "-f, --fingerprint <path>",
      "Source legacy direct fingerprint markdown file (required for review-command; legacy mode for context-bundle)",
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
    .option(
      "--no-tokens",
      "Skip tokens.css output (legacy direct fingerprint context-bundle only)",
    )
    .option("--readme", "Include README.md (context-bundle)")
    .option("--prompt-only", "Emit only prompt.md (context-bundle)")
    .option(
      "--name <name>",
      "Override the skill name (default: fingerprint.yml product or first scope) (context-bundle)",
    )
    .action(async (kind: string, opts) => {
      try {
        const parsed = parseEmitKind(kind);
        if (!parsed.ok) {
          console.error(`Error: ${parsed.error}`);
          process.exit(2);
          return;
        }

        const explicitFingerprint = typeof opts.fingerprint === "string";

        if (parsed.kind === "review-command") {
          const fingerprintPath = resolve(
            process.cwd(),
            opts.fingerprint ??
              resolveFingerprintPackage(undefined, process.cwd()).fingerprint,
          );
          const loaded = await loadFingerprint(fingerprintPath, {
            noEmbeddingBackfill: true,
          });
          const content = emitReviewCommand({
            fingerprint: loaded.fingerprint,
          });

          if (opts.stdout) {
            process.stdout.write(content);
            process.exit(0);
            return;
          }

          const outPath = resolve(
            process.cwd(),
            opts.out ?? DEFAULT_REVIEW_OUT,
          );
          await mkdir(dirname(outPath), { recursive: true });
          await writeFile(outPath, content, "utf-8");
          console.log(`Wrote ${outPath}`);
          process.exit(0);
          return;
        }

        // kind === "context-bundle"
        const outDir = resolve(
          process.cwd(),
          (opts.out as string | undefined) ?? DEFAULT_CONTEXT_OUT,
        );

        if (!explicitFingerprint) {
          const result = await writePackageContextBundle(
            resolveFingerprintPackage(undefined, process.cwd()),
            {
              outDir,
              readme: Boolean(opts.readme),
              promptOnly: Boolean(opts.promptOnly),
              name: opts.name as string | undefined,
            },
          );

          process.stdout.write(
            `Wrote ${result.files.length} file${
              result.files.length === 1 ? "" : "s"
            } to ${result.outDir}:\n`,
          );
          for (const f of result.files) {
            process.stdout.write(`  ${f}\n`);
          }
          process.exit(0);
          return;
        }

        const fingerprintPath = resolve(process.cwd(), opts.fingerprint);
        const { fingerprint } = await loadFingerprint(fingerprintPath);
        const result = await writeContextBundle(fingerprint, {
          outDir,
          tokens: opts.tokens !== false,
          readme: Boolean(opts.readme),
          promptOnly: Boolean(opts.promptOnly),
          name: opts.name as string | undefined,
          sourcePath: fingerprintPath,
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
        return;
      } catch (err) {
        console.error(
          `Error: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exit(2);
      }
    });
}
