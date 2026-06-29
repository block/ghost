import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { cac } from "cac";
import { UsageError } from "#ghost-core";
import { registerChecksCommand } from "./commands/checks-command.js";
import { formatGhostHelp } from "./commands/command-discovery.js";
import { failFromError } from "./commands/errors.js";
import { registerFingerprintCommands } from "./commands/fingerprint-commands.js";
import { registerGatherCommand } from "./commands/gather-command.js";
import { registerManifestCommand } from "./commands/manifest-command.js";
import { registerMigrateCommand } from "./commands/migrate-command.js";
import {
  buildReviewPacket,
  formatReviewPacketMarkdown,
} from "./commands/review-packet.js";
import { registerSkillCommand } from "./commands/skill-command.js";
import {
  UnknownSurfaceError,
  writeUnknownSurfaceError,
} from "./commands/surface-guard.js";

const execFileAsync = promisify(execFile);

export {
  buildCliManifest,
  getCommandDiscoveryMetadata,
} from "./commands/command-discovery.js";

export function buildCli(): ReturnType<typeof cac> {
  const cli = cac("ghost");

  registerFingerprintCommands(cli);

  registerGatherCommand(cli);
  registerChecksCommand(cli);
  registerManifestCommand(cli);
  registerMigrateCommand(cli);
  registerSkillCommand(cli);

  // --- review ---
  cli
    .command(
      "review",
      "Emit an evidence-routed advisory review prompt from the fingerprint package and a git diff.",
    )
    .option("--base <ref>", "Git ref to diff against (default: HEAD)")
    .option(
      "--diff <patch>",
      "Unified diff file to embed in the review instead of running git diff. Use '-' for stdin.",
    )
    .option(
      "--surface <ids>",
      "Surface id(s) the change touches (comma-separated or repeated). The agent names them.",
    )
    .option(
      "--package <dir>",
      "Exact fingerprint package directory; bypasses stack discovery",
    )
    .option(
      "--max-diff-bytes <n>",
      "Maximum diff bytes to include in the review packet (default: 200000)",
    )
    .option("--format <fmt>", "Output format: markdown or json", {
      default: "markdown",
    })
    .action(async (opts) => {
      try {
        if (opts.format !== "markdown" && opts.format !== "json") {
          console.error("Error: --format must be 'markdown' or 'json'");
          process.exit(2);
          return;
        }
        const packageDir =
          typeof opts.package === "string" ? opts.package : undefined;
        const maxDiffBytes = parsePositiveIntegerOption(
          opts.maxDiffBytes,
          "--max-diff-bytes",
        );
        const surfaces = parseSurfaceIdsOption(opts.surface);
        const diffText =
          typeof opts.diff === "string"
            ? await readDiffInput(opts.diff)
            : await readGitDiff(process.cwd(), opts.base ?? "HEAD");
        const packet = await buildReviewPacket({
          packageDir,
          diffText,
          surfaces,
          maxDiffBytes,
        });
        if (opts.format === "json") {
          process.stdout.write(`${JSON.stringify(packet, null, 2)}\n`);
        } else {
          process.stdout.write(formatReviewPacketMarkdown(packet));
        }
        process.exit(0);
      } catch (err) {
        if (err instanceof UnknownSurfaceError) {
          writeUnknownSurfaceError(
            err.unknown,
            opts.format === "json" ? "json" : "markdown",
          );
          process.exit(2);
          return;
        }
        failFromError(err);
      }
    });

  cli.help((sections) => formatGhostHelp(cli, sections));
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

function parseSurfaceIdsOption(value: unknown): string[] {
  const raw = Array.isArray(value) ? value : value === undefined ? [] : [value];
  const ids = raw
    .flatMap((entry) => String(entry).split(","))
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
  return [...new Set(ids)];
}

function parsePositiveIntegerOption(
  value: unknown,
  flagName: string,
): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" && typeof value !== "number") {
    throw new UsageError(`${flagName} must be a positive integer`);
  }
  if (typeof value === "string" && value.trim() === "") {
    throw new UsageError(`${flagName} must be a positive integer`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new UsageError(`${flagName} must be a positive integer`);
  }
  return parsed;
}

async function readDiffInput(input: string): Promise<string> {
  if (input === "-") return readStdin();
  return readFile(resolve(process.cwd(), input), "utf-8");
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf-8");
}

async function readGitDiff(cwd: string, base: unknown): Promise<string> {
  const { stdout } = await execFileAsync(
    "git",
    ["diff", "--unified=80", typeof base === "string" ? base : "HEAD"],
    {
      cwd,
      maxBuffer: 1024 * 1024 * 20,
    },
  );
  return stdout;
}
