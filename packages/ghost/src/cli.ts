import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { cac } from "cac";
import { formatGhostHelp } from "./command-discovery.js";
import { loadComparableFingerprint } from "./comparable-fingerprint.js";
import {
  compare,
  formatComparison,
  formatComparisonJSON,
  formatCompositeComparison,
  formatCompositeComparisonJSON,
  formatGhostDriftCheckMarkdown,
  formatTemporalComparison,
  formatTemporalComparisonJSON,
  readHistory,
  readSyncManifest,
  runGateCli,
  runGhostDriftCheck,
} from "./core/index.js";
import {
  registerAckCommand,
  registerDivergeCommand,
  registerTrackCommand,
} from "./evolution-commands.js";
import {
  buildReviewPacket,
  formatReviewPacketMarkdown,
} from "./review-packet.js";
import { formatSemanticDiff } from "./scan/index.js";
import { registerScanCommands } from "./scan-commands.js";
import { registerSkillCommand } from "./skill-command.js";

const execFileAsync = promisify(execFile);

export { getCommandDiscoveryMetadata } from "./command-discovery.js";

export function buildCli(): ReturnType<typeof cac> {
  const cli = cac("ghost");

  registerScanCommands(cli);

  // --- compare ---
  cli
    .command(
      "compare [...fingerprints]",
      "Compare two or more fingerprints or root .ghost bundles. N=2 returns a pairwise delta; N≥3 returns a composite fingerprint.",
    )
    .option("--semantic", "Qualitative diff of decisions + palette (N=2 only)")
    .option(
      "--temporal",
      "Add velocity, trajectory, and ack bounds (N=2, reads .ghost/history.jsonl)",
    )
    .option(
      "--history-dir <dir>",
      "Directory containing .ghost/history.jsonl (for --temporal, defaults to cwd)",
    )
    .option(
      "--gate",
      "Reconcile against a sync manifest and emit a structured pass/fail verdict (N=2 only)",
    )
    .option(
      "--sync <path>",
      "Sync manifest path for --gate (default: ./.ghost-sync.json)",
    )
    .option(
      "--max-divergence-days <n>",
      "For --gate: flag diverging dimensions older than this many days as uncovered",
    )
    .option("--format <fmt>", "Output format: cli or json", { default: "cli" })
    .action(async (fingerprints: string[], opts) => {
      try {
        if (opts.gate) {
          await runGateCli({
            fingerprints,
            cwd: process.cwd(),
            sync: opts.sync,
            format: opts.format,
            maxDivergenceDays: opts.maxDivergenceDays,
            loadFingerprint: loadComparableFingerprint,
            compare,
          });
          return;
        }

        const exprs = await Promise.all(
          fingerprints.map((path) => loadComparableFingerprint(path)),
        );

        let history: Awaited<ReturnType<typeof readHistory>> | undefined;
        let manifest: Awaited<ReturnType<typeof readSyncManifest>> | null =
          null;
        if (opts.temporal) {
          const historyDir = opts.historyDir ?? process.cwd();
          [history, manifest] = await Promise.all([
            readHistory(historyDir),
            readSyncManifest(historyDir),
          ]);
        }

        const result = compare(exprs, {
          semantic: Boolean(opts.semantic),
          history,
          manifest,
        });

        const isJson = opts.format === "json";

        if (result.mode === "composite") {
          const output = isJson
            ? formatCompositeComparisonJSON(result.composite)
            : formatCompositeComparison(result.composite);
          process.stdout.write(`${output}\n`);
          process.exit(0);
        }

        if (result.semantic) {
          if (isJson) {
            process.stdout.write(
              `${JSON.stringify(result.semantic, null, 2)}\n`,
            );
          } else {
            process.stdout.write(formatSemanticDiff(result.semantic));
          }
          process.exit(result.semantic.unchanged ? 0 : 1);
        }

        if (result.temporal) {
          const output = isJson
            ? formatTemporalComparisonJSON(result.temporal)
            : formatTemporalComparison(result.temporal);
          process.stdout.write(`${output}\n`);
          process.exit(result.temporal.distance > 0.5 ? 1 : 0);
        }

        const output = isJson
          ? formatComparisonJSON(result.comparison)
          : formatComparison(result.comparison);
        process.stdout.write(`${output}\n`);
        process.exit(result.comparison.distance > 0.5 ? 1 : 0);
      } catch (err) {
        console.error(
          `Error: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exit(2);
      }
    });

  registerAckCommand(cli);
  registerTrackCommand(cli);
  registerDivergeCommand(cli);
  registerSkillCommand(cli);

  // --- check ---
  cli
    .command(
      "check",
      "Run active ghost.checks/v1 gates from the resolved fingerprint stack against a git diff.",
    )
    .option("--base <ref>", "Git ref to diff against (default: HEAD)")
    .option(
      "--diff <patch>",
      "Unified diff file to check instead of running git diff. Use '-' for stdin.",
    )
    .option(
      "--package <dir>",
      "Exact fingerprint package directory; bypasses stack discovery",
    )
    .option(
      "--memory-dir <relative-dir>",
      "Relative fingerprint package directory for stack discovery (flag name retained; default: .ghost)",
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
        const diffText =
          typeof opts.diff === "string"
            ? await readDiffInput(opts.diff)
            : undefined;
        const report = await runGhostDriftCheck({
          cwd: process.cwd(),
          packageDir:
            typeof opts.package === "string" ? opts.package : undefined,
          memoryDir:
            typeof opts.memoryDir === "string" ? opts.memoryDir : undefined,
          base: typeof opts.base === "string" ? opts.base : undefined,
          diffText,
        });
        if (opts.format === "json") {
          process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
        } else {
          process.stdout.write(formatGhostDriftCheckMarkdown(report));
        }
        process.exit(report.result === "fail" ? 1 : 0);
      } catch (err) {
        console.error(
          `Error: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exit(2);
      }
    });

  // --- review ---
  cli
    .command(
      "review",
      "Emit an evidence-routed advisory review prompt from the fingerprint package and a git diff.",
    )
    .option("--base <ref>", "Git ref to diff against (default: HEAD)")
    .option(
      "--diff <patch>",
      "Unified diff file to review instead of running git diff. Use '-' for stdin.",
    )
    .option(
      "--package <dir>",
      "Exact fingerprint package directory; bypasses stack discovery",
    )
    .option(
      "--memory-dir <relative-dir>",
      "Relative fingerprint package directory for stack discovery (flag name retained; default: .ghost)",
    )
    .option(
      "--include-memory",
      "Include accepted decisions as accepted_decisions in the advisory packet (flag name retained).",
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
        const diffText =
          typeof opts.diff === "string"
            ? await readDiffInput(opts.diff)
            : await readGitDiff(process.cwd(), opts.base ?? "HEAD");
        const packet = await buildReviewPacket({
          packageDir,
          memoryDir:
            typeof opts.memoryDir === "string" ? opts.memoryDir : undefined,
          diffText,
          includeAcceptedDecisions: Boolean(opts.includeMemory),
        });
        if (opts.format === "json") {
          process.stdout.write(`${JSON.stringify(packet, null, 2)}\n`);
        } else {
          process.stdout.write(formatReviewPacketMarkdown(packet));
        }
        process.exit(0);
      } catch (err) {
        console.error(
          `Error: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exit(2);
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
