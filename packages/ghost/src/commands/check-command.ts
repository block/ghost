import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import type { CAC } from "cac";
import { UsageError } from "#ghost-core";
import { matchesGlob } from "../review/glob.js";
import { resolveFingerprintPackage } from "../scan/fingerprint-package.js";
import { loadHauntTree } from "../scan/haunt-tree.js";
import { resolveGhostDirDefault } from "../scan/package-paths.js";
import { failFromError } from "./errors.js";

const execFileAsync = promisify(execFile);

const CHECK_REPORT_SCHEMA = "ghost.check-report/v1" as const;

type CheckResult = "pass" | "fail";

type CheckDetectorType = "forbidden-regex" | "required-regex";

type CheckDetector = {
  type: CheckDetectorType;
  pattern: string;
  flags?: string;
  paths?: string[];
};

type CheckFrontmatterExtras = {
  id?: unknown;
  name?: unknown;
  title?: unknown;
  description?: unknown;
  severity?: unknown;
  detector?: unknown;
  message?: unknown;
  repair?: unknown;
};

export interface GhostCheckReport {
  schema: typeof CHECK_REPORT_SCHEMA;
  result: CheckResult;
  findings: GhostCheckFinding[];
}

export interface GhostCheckFinding {
  check_id: string;
  title: string;
  severity: string;
  path?: string;
  line?: number;
  detector: CheckDetectorType;
  message: string;
  match?: string;
  repair?: string;
}

type AddedLine = {
  path: string;
  line: number;
  text: string;
};

type AddedFile = {
  path: string;
  lines: AddedLine[];
};

/** Register `ghost check`, the deterministic diff gate used by external review lanes. */
export function registerCheckCommand(cli: CAC): void {
  cli
    .command(
      "check",
      "Run deterministic ghost.check/v1 gates with detectors against a git diff.",
    )
    .option("--base <ref>", "Git ref to diff against (default: HEAD)")
    .option(
      "--diff <patch>",
      "Unified diff file to check instead of running git diff. Use '-' for stdin.",
    )
    .option(
      "--package <dir>",
      "Use this fingerprint package directory (default: ./.ghost)",
    )
    .option("--format <fmt>", "Output format: markdown or json", {
      default: "markdown",
    })
    .action(async (opts) => {
      try {
        if (opts.format !== "markdown" && opts.format !== "json") {
          throw new UsageError("--format must be 'markdown' or 'json'");
        }
        const packageDir = resolveFingerprintPackage(
          typeof opts.package === "string"
            ? opts.package
            : resolveGhostDirDefault(),
          process.cwd(),
        ).dir;
        const diffText =
          typeof opts.diff === "string"
            ? await readDiffInput(opts.diff)
            : await readGitDiff(process.cwd(), opts.base ?? "HEAD");
        const report = await runDeterministicChecks({ packageDir, diffText });

        if (opts.format === "json") {
          process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
        } else {
          process.stdout.write(formatCheckReportMarkdown(report));
        }
        process.exit(report.result === "fail" ? 1 : 0);
      } catch (err) {
        failFromError(err);
      }
    });
}

export async function runDeterministicChecks({
  packageDir,
  diffText,
}: {
  packageDir: string;
  diffText: string;
}): Promise<GhostCheckReport> {
  const hauntTree = await loadHauntTree(packageDir);
  const checks = [...hauntTree.checks.values()];
  const addedFiles = parseAddedFiles(diffText);
  const findings: GhostCheckFinding[] = [];

  for (const check of checks) {
    const frontmatter = check.doc.frontmatter as CheckFrontmatterExtras;
    const detector = parseDetector(frontmatter.detector);
    if (!detector) continue;

    const regex = compileDetectorRegex(detector);
    const checkId = check.id || checkIdFor(frontmatter);
    const title = titleFor(frontmatter);
    const severity = stringOr(frontmatter.severity, "medium");
    const message =
      stringOr(frontmatter.message, undefined) ??
      stringOr(frontmatter.description, undefined) ??
      "Added diff content matched a Ghost deterministic check.";
    const repair = stringOr(frontmatter.repair, undefined);

    const targetFiles = addedFiles.filter((file) =>
      detectorMatchesPath(detector, file.path),
    );

    if (detector.type === "forbidden-regex") {
      for (const file of targetFiles) {
        for (const line of file.lines) {
          regex.lastIndex = 0;
          for (const match of line.text.matchAll(regex)) {
            findings.push({
              check_id: checkId,
              title,
              severity,
              path: line.path,
              line: line.line,
              detector: detector.type,
              message,
              ...(match[0] ? { match: match[0] } : {}),
              ...(repair ? { repair } : {}),
            });
            if (!regex.global) break;
          }
        }
      }
      continue;
    }

    if (detector.type === "required-regex") {
      for (const file of targetFiles) {
        if (file.lines.length === 0) continue;
        const hasRequired = file.lines.some((line) => {
          regex.lastIndex = 0;
          return regex.test(line.text);
        });
        if (!hasRequired) {
          findings.push({
            check_id: checkId,
            title,
            severity,
            path: file.path,
            line: file.lines[0]?.line,
            detector: detector.type,
            message,
            ...(repair ? { repair } : {}),
          });
        }
      }
    }
  }

  return {
    schema: CHECK_REPORT_SCHEMA,
    result: findings.length > 0 ? "fail" : "pass",
    findings,
  };
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

function parseAddedFiles(diffText: string): AddedFile[] {
  const files = new Map<string, AddedFile>();
  let currentPath: string | undefined;
  let newLine: number | undefined;

  for (const line of diffText.split(/\r?\n/)) {
    if (line.startsWith("+++ ")) {
      const path = normalizeDiffPath(line.slice(4).trim());
      currentPath = path === "/dev/null" ? undefined : path;
      newLine = undefined;
      if (currentPath && !files.has(currentPath)) {
        files.set(currentPath, { path: currentPath, lines: [] });
      }
      continue;
    }

    if (line.startsWith("@@")) {
      const match = /\+(\d+)(?:,(\d+))?/.exec(line);
      newLine = match ? Number(match[1]) : undefined;
      continue;
    }

    if (!currentPath || newLine === undefined) continue;
    if (line.startsWith("+")) {
      files.get(currentPath)?.lines.push({
        path: currentPath,
        line: newLine,
        text: line.slice(1),
      });
      newLine += 1;
      continue;
    }
    if (line.startsWith("-")) continue;
    if (line.startsWith("\\")) continue;
    newLine += 1;
  }

  return [...files.values()].filter((file) => file.lines.length > 0);
}

function normalizeDiffPath(raw: string): string {
  const withoutQuotes = raw.replace(/^"|"$/g, "");
  if (withoutQuotes === "/dev/null") return withoutQuotes;
  return withoutQuotes.replace(/^[ab]\//, "");
}

function parseDetector(value: unknown): CheckDetector | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  const raw = value as Record<string, unknown>;
  if (raw.type !== "forbidden-regex" && raw.type !== "required-regex") return;
  if (typeof raw.pattern !== "string" || raw.pattern.length === 0) return;
  const flags = typeof raw.flags === "string" ? raw.flags : undefined;
  const paths = Array.isArray(raw.paths)
    ? raw.paths.filter((path): path is string => typeof path === "string")
    : undefined;
  return {
    type: raw.type,
    pattern: raw.pattern,
    ...(flags ? { flags } : {}),
    ...(paths && paths.length > 0 ? { paths } : {}),
  };
}

function compileDetectorRegex(detector: CheckDetector): RegExp {
  const flags = new Set((detector.flags ?? "").split(""));
  flags.add("g");
  try {
    return new RegExp(detector.pattern, [...flags].join(""));
  } catch (err) {
    throw new UsageError(
      `Invalid ${detector.type} detector regex '${detector.pattern}': ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}

function detectorMatchesPath(detector: CheckDetector, path: string): boolean {
  if (!detector.paths || detector.paths.length === 0) return true;
  return detector.paths.some((pattern) => matchesGlob(pattern, path));
}

function checkIdFor(frontmatter: CheckFrontmatterExtras): string {
  return (
    stringOr(frontmatter.id, undefined) ??
    slugify(stringOr(frontmatter.name, undefined) ?? "ghost-check")
  );
}

function titleFor(frontmatter: CheckFrontmatterExtras): string {
  return (
    stringOr(frontmatter.title, undefined) ??
    stringOr(frontmatter.description, undefined) ??
    stringOr(frontmatter.name, "Ghost check")
  );
}

function stringOr(value: unknown, fallback: string | undefined): string;
function stringOr(value: unknown, fallback: string): string;
function stringOr(
  value: unknown,
  fallback: string | undefined,
): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatCheckReportMarkdown(report: GhostCheckReport): string {
  const lines = ["# Ghost Check Report", "", `Result: ${report.result}`, ""];
  if (report.findings.length === 0) {
    lines.push("No deterministic check findings.", "");
    return lines.join("\n");
  }

  lines.push("## Findings", "");
  for (const finding of report.findings) {
    const location = finding.path
      ? `${finding.path}${finding.line ? `:${finding.line}` : ""}`
      : "PR-level";
    lines.push(`- [${finding.severity}] ${finding.title}`);
    lines.push(`  - Location: ${location}`);
    lines.push(`  - Check: ${finding.check_id}`);
    lines.push(`  - Detector: ${finding.detector}`);
    if (finding.match) lines.push(`  - Match: \`${finding.match}\``);
    lines.push(`  - Message: ${finding.message}`);
    if (finding.repair) lines.push(`  - Repair: ${finding.repair}`);
  }
  lines.push("");
  return lines.join("\n");
}
