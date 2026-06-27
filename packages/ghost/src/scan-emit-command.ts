import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { CAC } from "cac";
import {
  loadPackageContext,
  type PackageContext,
} from "./context/package-context.js";
import { emitPackageReviewCommand } from "./context/package-review-command.js";
import { resolveFingerprintPackage } from "./fingerprint.js";

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
      "--package <dir>",
      "Use exactly this fingerprint package directory (default: ./.ghost)",
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
  package?: unknown;
}): Promise<PackageContext> {
  return loadPackageContext(
    resolveFingerprintPackage(
      typeof opts.package === "string" ? opts.package : undefined,
      process.cwd(),
    ),
  );
}
