import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { CAC } from "cac";
import {
  loadPackageContext,
  type PackageContext,
} from "./context/package-context.js";
import { emitPackageReviewCommand } from "./context/package-review-command.js";
import { resolveFingerprintPackage } from "./fingerprint.js";
import {
  fingerprintStackToPackageContext,
  loadFingerprintStackForPath,
  normalizeMemoryDir,
} from "./scan/fingerprint-stack.js";

const DEFAULT_REVIEW_OUT = ".claude/commands/design-review.md";

export const SUPPORTED_KINDS = ["review-command"] as const;
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
      "Emit a derived artifact from the fingerprint package (review-command).",
    )
    .option(
      "--path <path>",
      "Resolve a nested fingerprint stack for this repo path",
    )
    .option(
      "--package <dir>",
      "Use exactly this fingerprint package directory instead of resolving a stack",
    )
    .option(
      "--memory-dir <relative-dir>",
      "Relative fingerprint package directory for --path stack resolution (flag name retained; default: .ghost)",
    )
    .option(
      "-o, --out <path>",
      `Output path (review-command → ${DEFAULT_REVIEW_OUT})`,
    )
    .option("--stdout", "Write to stdout instead of a file")
    .action(async (kind: string, opts) => {
      try {
        const parsed = parseEmitKind(kind);
        if (!parsed.ok) {
          console.error(`Error: ${parsed.error}`);
          process.exit(2);
          return;
        }

        const explicitPath = typeof opts.path === "string";
        const explicitPackage = typeof opts.package === "string";
        const explicitSources = [explicitPath, explicitPackage].filter(
          Boolean,
        ).length;
        if (explicitSources > 1) {
          console.error("Error: use only one of --path or --package");
          process.exit(2);
          return;
        }

        const context = await loadEmitPackageContext(opts);
        const content = emitPackageReviewCommand({
          context,
        });

        if (opts.stdout) {
          process.stdout.write(content);
          process.exit(0);
          return;
        }

        const outPath = resolve(process.cwd(), opts.out ?? DEFAULT_REVIEW_OUT);
        await mkdir(dirname(outPath), { recursive: true });
        await writeFile(outPath, content, "utf-8");
        console.log(`Wrote ${outPath}`);
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

async function loadEmitPackageContext(opts: {
  path?: unknown;
  package?: unknown;
  memoryDir?: unknown;
}): Promise<PackageContext> {
  if (typeof opts.package === "string") {
    return loadPackageContext(
      resolveFingerprintPackage(opts.package, process.cwd()),
    );
  }

  const stack = await loadFingerprintStackForPath(
    typeof opts.path === "string" ? opts.path : ".",
    process.cwd(),
    {
      memoryDir: normalizeMemoryDir(
        typeof opts.memoryDir === "string" ? opts.memoryDir : undefined,
      ),
    },
  );
  return fingerprintStackToPackageContext(stack);
}
