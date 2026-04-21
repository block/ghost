import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { CAC } from "cac";
import {
  emitReviewCommand,
  loadFingerprint,
  writeContextBundle,
} from "./core/index.js";
import { loadSkillBundle } from "./skill-bundle.js";

const DEFAULT_FINGERPRINT = "fingerprint.md";
const DEFAULT_REVIEW_OUT = ".claude/commands/design-review.md";
const DEFAULT_CONTEXT_OUT = "ghost-context";
const DEFAULT_SKILL_OUT = ".claude/skills/ghost-drift";

export const SUPPORTED_KINDS = [
  "review-command",
  "context-bundle",
  "skill",
] as const;
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
      `Emit a derived artifact from fingerprint.md (kinds: ${SUPPORTED_KINDS.join(", ")})`,
    )
    .option(
      "-e, --fingerprint <path>",
      `Source fingerprint file (default: ${DEFAULT_FINGERPRINT})`,
    )
    .option(
      "-o, --out <path>",
      `Output path (review-command → ${DEFAULT_REVIEW_OUT}; context-bundle → ${DEFAULT_CONTEXT_OUT}/; skill → ${DEFAULT_SKILL_OUT}/)`,
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
      "Emit only prompt.md — skips SKILL.md / fingerprint.md / tokens.css (context-bundle)",
    )
    .option(
      "--name <name>",
      "Override the skill name (default: fingerprint id) (context-bundle)",
    )
    .action(async (kind: string, opts) => {
      try {
        const parsed = parseEmitKind(kind);
        if (!parsed.ok) {
          console.error(`Error: ${parsed.error}`);
          process.exit(2);
        }

        if (parsed.kind === "skill") {
          const outDir = resolve(
            process.cwd(),
            (opts.out as string | undefined) ?? DEFAULT_SKILL_OUT,
          );
          const bundle = loadSkillBundle();
          const written: string[] = [];
          for (const file of bundle) {
            const outPath = resolve(outDir, file.path);
            await mkdir(dirname(outPath), { recursive: true });
            await writeFile(outPath, file.content, "utf-8");
            written.push(file.path);
          }
          process.stdout.write(
            `Wrote ${written.length} file${written.length === 1 ? "" : "s"} to ${outDir}:\n`,
          );
          for (const f of written) process.stdout.write(`  ${f}\n`);
          process.exit(0);
        }

        const fingerprintPath = resolve(
          process.cwd(),
          opts.fingerprint ?? DEFAULT_FINGERPRINT,
        );

        if (parsed.kind === "review-command") {
          const loaded = await loadFingerprint(fingerprintPath, {
            noEmbeddingBackfill: true,
          });
          const content = emitReviewCommand({
            fingerprint: loaded.fingerprint,
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
      } catch (err) {
        console.error(
          `Error: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exit(2);
      }
    });
}
