import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { CAC } from "cac";
import {
  emitPackageReviewCommand,
  emitReviewCommand,
  loadFingerprint,
  loadMemoryStackForPath,
  loadPackageMemory,
  memoryStackToPackageMemory,
  normalizeMemoryDir,
  type PackageMemory,
  resolveFingerprintPackage,
  writeContextBundle,
  writePackageContextBundle,
  writePackageContextBundleFromMemory,
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
      "Source legacy direct fingerprint markdown file (legacy mode for review-command/context-bundle)",
    )
    .option("--path <path>", "Resolve a nested memory stack for this repo path")
    .option(
      "--package <dir>",
      "Use exactly this memory package directory instead of resolving a stack",
    )
    .option(
      "--memory-dir <relative-dir>",
      "Relative memory package directory for --path stack resolution (default: .ghost)",
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
        const explicitPath = typeof opts.path === "string";
        const explicitPackage = typeof opts.package === "string";
        const explicitSources = [
          explicitFingerprint,
          explicitPath,
          explicitPackage,
        ].filter(Boolean).length;
        if (explicitSources > 1) {
          console.error(
            "Error: use only one of --fingerprint, --path, or --package",
          );
          process.exit(2);
          return;
        }

        if (parsed.kind === "review-command") {
          let content: string;
          if (explicitFingerprint) {
            const loaded = await loadFingerprint(
              resolve(process.cwd(), opts.fingerprint),
              {
                noEmbeddingBackfill: true,
              },
            );
            content = emitReviewCommand({ fingerprint: loaded.fingerprint });
          } else {
            const memory = await loadEmitPackageMemory(opts);
            content = emitPackageReviewCommand({
              memory,
            });
          }

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
          const memory = await loadEmitPackageMemory(opts);
          const result = explicitPackage
            ? await writePackageContextBundle(
                resolveFingerprintPackage(opts.package, process.cwd()),
                {
                  outDir,
                  readme: Boolean(opts.readme),
                  promptOnly: Boolean(opts.promptOnly),
                  name: opts.name as string | undefined,
                },
              )
            : await writePackageContextBundleFromMemory(memory, {
                outDir,
                readme: Boolean(opts.readme),
                promptOnly: Boolean(opts.promptOnly),
                name: opts.name as string | undefined,
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

async function loadEmitPackageMemory(opts: {
  path?: unknown;
  package?: unknown;
  name?: unknown;
  memoryDir?: unknown;
}): Promise<PackageMemory> {
  if (typeof opts.package === "string") {
    return loadPackageMemory(
      resolveFingerprintPackage(opts.package, process.cwd()),
      typeof opts.name === "string" ? opts.name : undefined,
    );
  }

  const stack = await loadMemoryStackForPath(
    typeof opts.path === "string" ? opts.path : ".",
    process.cwd(),
    {
      memoryDir: normalizeMemoryDir(
        typeof opts.memoryDir === "string" ? opts.memoryDir : undefined,
      ),
    },
  );
  return memoryStackToPackageMemory(
    stack,
    typeof opts.name === "string" ? opts.name : undefined,
  );
}
