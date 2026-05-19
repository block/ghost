import { execFile } from "node:child_process";
import { type Dirent, readFileSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { cac } from "cac";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import {
  GHOST_DECISIONS_DIRNAME,
  type GhostDecisionDocument,
  lintGhostDecision,
} from "#ghost-core";
import { formatSemanticDiff, resolveFingerprintPackage } from "#scan";
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
  runGhostDriftCheck,
} from "./core/index.js";
import {
  registerAckCommand,
  registerDivergeCommand,
  registerTrackCommand,
} from "./evolution-commands.js";
import { registerScanCommands } from "./scan-commands.js";
import { registerSkillCommand } from "./skill-command.js";

const execFileAsync = promisify(execFile);

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
    .option("--format <fmt>", "Output format: cli or json", { default: "cli" })
    .action(async (fingerprints: string[], opts) => {
      try {
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
      "Run active ghost.checks/v1 gates from .ghost/checks.yml against a git diff.",
    )
    .option("--base <ref>", "Git ref to diff against (default: HEAD)")
    .option(
      "--diff <patch>",
      "Unified diff file to check instead of running git diff. Use '-' for stdin.",
    )
    .option(
      "--package <dir>",
      "Fingerprint package directory (default: .ghost)",
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
      "Fingerprint package directory (default: .ghost)",
    )
    .option(
      "--include-memory",
      "Include accepted product-experience decisions from .ghost/decisions in the advisory packet.",
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
        const packet: ReviewPacket = {
          schema: "ghost.advisory-review/v1",
          package_dir: paths.dir,
          patterns: parseYaml(await readFile(paths.patterns, "utf-8")),
          survey: JSON.parse(await readFile(paths.survey, "utf-8")),
          intent: (await readOptional(paths.intent)) ?? null,
          checks: (await readOptional(paths.checks)) ?? null,
          diff: diffText,
          required_finding_citations: [
            "diff location",
            "patterns.yml composition pattern",
            "survey evidence",
            "intent.md when relevant",
            "precedent/example",
            "repair",
          ],
        };
        if (opts.includeMemory) {
          packet.memory = {
            decisions: await readAcceptedDecisions(
              resolve(paths.dir, GHOST_DECISIONS_DIRNAME),
            ),
          };
        }
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

interface ReviewPacket {
  schema: "ghost.advisory-review/v1";
  package_dir: string;
  patterns: unknown;
  survey: unknown;
  intent: string | null;
  checks: string | null;
  memory?: { decisions: GhostDecisionDocument[] };
  diff: string;
  required_finding_citations: string[];
}

function formatReviewPacketMarkdown(packet: ReviewPacket): string {
  return `# Ghost Advisory Review

Package: ${packet.package_dir}

Review this diff as a non-blocking design-language critic. Advisory findings must be evidence-routed and must cite: ${packet.required_finding_citations.join(", ")}. Do not fail the build unless the issue is tied to an active deterministic check in checks.yml.

## Patterns

\`\`\`yaml
${stringifyYaml(packet.patterns)}
\`\`\`

## Survey Evidence

\`\`\`json
${JSON.stringify(packet.survey, null, 2)}
\`\`\`

## Human Intent

\`\`\`markdown
${packet.intent ?? "_No intent.md present. Treat patterns.yml and survey.json as observed evidence, not declared human intent._"}
\`\`\`

${formatMemorySection(packet.memory ?? null)}

## Active Checks

\`\`\`yaml
${packet.checks ?? "schema: ghost.checks/v1\nid: none\nchecks: []\n"}
\`\`\`

## Diff

\`\`\`diff
${packet.diff}
\`\`\`
`;
}

async function readOptional(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, "utf-8");
  } catch {
    return undefined;
  }
}

async function readAcceptedDecisions(
  dirPath: string,
): Promise<GhostDecisionDocument[]> {
  let entries: Dirent[];
  try {
    entries = await readdir(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }

  const decisions: GhostDecisionDocument[] = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isFile()) continue;
    if (entry.name.startsWith(".")) continue;
    if (!/\.ya?ml$/i.test(entry.name)) continue;

    const path = resolve(dirPath, entry.name);
    const parsed = parseYaml(await readFile(path, "utf-8"));
    const report = lintGhostDecision(parsed);
    if (report.errors > 0) {
      const first = report.issues.find((issue) => issue.severity === "error");
      const suffix = first?.path ? ` @ ${first.path}` : "";
      throw new Error(
        `${path} failed decision lint: ${first?.message ?? "invalid decision"}${suffix}`,
      );
    }
    const decision = parsed as GhostDecisionDocument;
    if (decision.status === "accepted") decisions.push(decision);
  }

  return decisions;
}

function formatMemorySection(
  memory: { decisions: GhostDecisionDocument[] } | null,
): string {
  if (!memory) return "";
  if (memory.decisions.length === 0) {
    return `## Accepted Product-Experience Decisions

_No accepted decisions found in .ghost/decisions._
`;
  }

  const lines = ["## Accepted Product-Experience Decisions", ""];
  for (const decision of memory.decisions) {
    lines.push(`### ${decision.title}`);
    lines.push("");
    lines.push(`- **ID:** \`${decision.id}\``);
    lines.push(`- **Claim:** ${decision.claim}`);
    lines.push(`- **Rationale:** ${decision.rationale}`);
    if (decision.scope) {
      lines.push(`- **Scope:** ${formatDecisionScope(decision.scope)}`);
    }
    lines.push(
      `- **Evidence:** ${decision.evidence
        .map(
          (entry) =>
            entry.path ??
            entry.survey_surface_id ??
            entry.locator ??
            entry.note,
        )
        .join(", ")}`,
    );
    lines.push("");
  }

  return lines.join("\n");
}

function formatDecisionScope(
  scope: NonNullable<GhostDecisionDocument["scope"]>,
): string {
  const parts: string[] = [];
  if (scope.roles?.length) parts.push(`roles=${scope.roles.join("/")}`);
  if (scope.scopes?.length) parts.push(`scopes=${scope.scopes.join("/")}`);
  if (scope.surface_types?.length) {
    parts.push(`surface_types=${scope.surface_types.join("/")}`);
  }
  if (scope.pattern_ids?.length) {
    parts.push(`pattern_ids=${scope.pattern_ids.join("/")}`);
  }
  if (scope.paths?.length) parts.push(`paths=${scope.paths.join("/")}`);
  return parts.length ? parts.join("; ") : "global";
}
