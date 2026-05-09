import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { loadSkillBundle } from "@ghost/core";
import { cac } from "cac";
import {
  formatSemanticDiff,
  loadFingerprint,
  resolveFingerprintPackage,
} from "ghost-fingerprint";
import {
  compare,
  formatComparison,
  formatComparisonJSON,
  formatCompositeComparison,
  formatCompositeComparisonJSON,
  formatGhostDriftCheckMarkdown,
  formatGitHubCommentDryRun,
  formatTemporalComparison,
  formatTemporalComparisonJSON,
  readHistory,
  readSyncManifest,
  runGhostDriftCheck,
  runGhostDriftGitHubComment,
} from "./core/index.js";
import {
  registerAckCommand,
  registerDivergeCommand,
  registerTrackCommand,
} from "./evolution-commands.js";

/**
 * The skill bundle's source files live in `src/skill-bundle/` as real
 * markdown and are copied verbatim into `dist/skill-bundle/` by the
 * package build step. This loader points the shared `@ghost/core`
 * walker at that built directory at runtime.
 */
const SKILL_BUNDLE_ROOT = fileURLToPath(
  new URL("./skill-bundle", import.meta.url),
);

const DEFAULT_SKILL_OUT = ".claude/skills/ghost-drift";
const execFileAsync = promisify(execFile);

export function buildCli(): ReturnType<typeof cac> {
  const cli = cac("ghost-drift");

  // --- compare ---
  cli
    .command(
      "compare [...fingerprints]",
      "Compare two or more fingerprints. N=2 returns a pairwise delta; N≥3 returns a composite fingerprint (pairwise matrix, centroid, spread, clusters).",
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
    .option("--format <fmt>", "Output format: cli or json", { default: "cli" })
    .action(async (fingerprints: string[], opts) => {
      try {
        const parsed = await Promise.all(
          fingerprints.map((path) => loadFingerprint(path)),
        );
        const exprs = parsed.map((p) => p.fingerprint);

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

  // --- check ---
  cli
    .command(
      "check",
      "Run active ghost.checks/v1 gates from .ghost/fingerprint/checks.yml against a git diff.",
    )
    .option("--base <ref>", "Git ref to diff against (default: HEAD)")
    .option(
      "--diff <patch>",
      "Unified diff file to check instead of running git diff. Use '-' for stdin.",
    )
    .option(
      "--package <dir>",
      "Fingerprint package directory (default: .ghost/fingerprint)",
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

  // --- github-comment ---
  cli
    .command(
      "github-comment",
      "Run ghost-drift check and create/update GitHub PR inline comments plus one summary comment.",
    )
    .option("--repo <repo>", "GitHub repository in owner/name form")
    .option("--pr <number>", "Pull request number")
    .option("--base <ref>", "Git ref to diff against (default: HEAD)")
    .option(
      "--diff <patch>",
      "Unified diff file to check instead of running git diff. Use '-' for stdin.",
    )
    .option(
      "--package <dir>",
      "Fingerprint package directory (default: .ghost/fingerprint)",
    )
    .option("--dry-run", "Print comments without calling GitHub")
    .action(async (opts) => {
      try {
        if (typeof opts.repo !== "string" || opts.repo.trim() === "") {
          console.error("Error: --repo is required");
          process.exit(2);
          return;
        }
        const pr = Number(opts.pr);
        if (!Number.isInteger(pr) || pr < 1) {
          console.error("Error: --pr must be a positive integer");
          process.exit(2);
          return;
        }
        const diffText =
          typeof opts.diff === "string"
            ? await readDiffInput(opts.diff)
            : undefined;
        const result = await runGhostDriftGitHubComment({
          repo: opts.repo,
          pr,
          cwd: process.cwd(),
          packageDir:
            typeof opts.package === "string" ? opts.package : undefined,
          base: typeof opts.base === "string" ? opts.base : undefined,
          diffText,
          dryRun: Boolean(opts.dryRun),
        });

        if (opts.dryRun) {
          process.stdout.write(formatGitHubCommentDryRun(result));
        } else {
          const urls = [
            ...result.inline_comments.map((comment) => comment.html_url),
            result.summary_comment_url,
          ].filter(Boolean);
          process.stdout.write(
            `${urls.join("\n") || `Updated PR #${pr} Ghost drift comments.`}\n`,
          );
        }
        process.exit(result.report.result === "fail" ? 1 : 0);
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
      "Fingerprint package directory (default: .ghost/fingerprint)",
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
        const paths = resolveFingerprintPackage(packageDir, process.cwd());
        const diffText =
          typeof opts.diff === "string"
            ? await readDiffInput(opts.diff)
            : await readGitDiff(process.cwd(), opts.base ?? "HEAD");
        const packet = {
          schema: "ghost.advisory-review/v1",
          package_dir: paths.dir,
          profile: await readFile(paths.profile, "utf-8"),
          survey: JSON.parse(await readFile(paths.survey, "utf-8")),
          checks: await readFile(paths.checks, "utf-8"),
          diff: diffText,
          required_finding_citations: [
            "diff location",
            "profile section",
            "survey evidence",
            "precedent/example",
            "repair",
          ],
        };
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

  // --- emit (skill only) ---
  cli
    .command(
      "emit <kind>",
      "Emit the ghost-drift agentskills.io bundle (kind: skill).",
    )
    .option(
      "-o, --out <path>",
      `Output directory (default: ${DEFAULT_SKILL_OUT})`,
    )
    .action(async (kind: string, opts) => {
      try {
        if (kind !== "skill") {
          console.error(
            `Error: unknown emit kind '${kind}'. Supported: skill.`,
          );
          process.exit(2);
          return;
        }

        const outDir = resolve(
          process.cwd(),
          (opts.out as string | undefined) ?? DEFAULT_SKILL_OUT,
        );
        const bundle = loadSkillBundle(SKILL_BUNDLE_ROOT);
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
      } catch (err) {
        console.error(
          `Error: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exit(2);
      }
    });

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

function formatReviewPacketMarkdown(packet: {
  package_dir: string;
  profile: string;
  survey: unknown;
  checks: string;
  diff: string;
  required_finding_citations: string[];
}): string {
  return `# Ghost Advisory Review

Package: ${packet.package_dir}

Review this diff as a non-blocking design-language critic. Advisory findings must be evidence-routed and must cite: ${packet.required_finding_citations.join(", ")}. Do not fail the build unless the issue is tied to an active deterministic check in checks.yml.

## Profile

\`\`\`markdown
${packet.profile}
\`\`\`

## Survey Evidence

\`\`\`json
${JSON.stringify(packet.survey, null, 2)}
\`\`\`

## Active Checks

\`\`\`yaml
${packet.checks}
\`\`\`

## Diff

\`\`\`diff
${packet.diff}
\`\`\`
`;
}
