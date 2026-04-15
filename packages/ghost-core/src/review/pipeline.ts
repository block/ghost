import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createProvider } from "../llm/index.js";
import type {
  CollectedFile,
  DesignFingerprint,
  LLMConfig,
  ReviewConfig,
  ReviewDimension,
  ReviewFileResult,
  ReviewIssue,
  ReviewReport,
  ReviewSeverity,
  ReviewSummary,
} from "../types.js";
import { collectFiles, collectGitDiff } from "./file-collector.js";
import { buildReviewPrompt } from "./prompts.js";

/** Max characters to send per LLM call (~30K tokens ≈ 120K chars) */
const MAX_BATCH_CHARS = 120_000;

export interface ReviewOptions {
  /** Explicit file paths to review */
  files?: string[];
  /** Review git diff (default behavior if no files specified) */
  diff?: { base?: string; staged?: boolean };
  /** Working directory. Default: process.cwd() */
  cwd?: string;
  /** Explicit fingerprint object */
  fingerprint?: DesignFingerprint;
  /** Path to fingerprint JSON file */
  fingerprintPath?: string;
  /** Review config overrides */
  config?: ReviewConfig;
  /** LLM config. Required — review is LLM-powered. */
  llmConfig?: LLMConfig;
}

async function resolveFingerprint(
  options: ReviewOptions,
  cwd: string,
): Promise<DesignFingerprint> {
  if (options.fingerprint) return options.fingerprint;

  const fpPath = options.fingerprintPath
    ? resolve(cwd, options.fingerprintPath)
    : resolve(cwd, ".ghost-fingerprint.json");

  if (existsSync(fpPath)) {
    const raw = await readFile(fpPath, "utf-8");
    return JSON.parse(raw) as DesignFingerprint;
  }

  throw new Error(
    "No fingerprint found. Run `ghost profile . --emit` to generate .ghost-fingerprint.json, " +
      "or pass --fingerprint <path> explicitly.",
  );
}

function resolveLLMConfig(options: ReviewOptions): LLMConfig {
  if (options.llmConfig) return options.llmConfig;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) return { provider: "anthropic", apiKey };

  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) return { provider: "openai", apiKey: openaiKey };

  throw new Error(
    "ghost review requires an LLM API key. Set ANTHROPIC_API_KEY or OPENAI_API_KEY.",
  );
}

function computeSummary(files: ReviewFileResult[]): ReviewSummary {
  const byDimension: Record<string, number> = {};
  let totalIssues = 0;
  let errors = 0;
  let warnings = 0;
  let fixesAvailable = 0;
  let filesWithIssues = 0;

  for (const file of files) {
    if (file.issues.length > 0) filesWithIssues++;
    for (const issue of file.issues) {
      totalIssues++;
      byDimension[issue.dimension] = (byDimension[issue.dimension] ?? 0) + 1;
      if (issue.severity === "error") errors++;
      else if (issue.severity === "warning") warnings++;
      if (issue.fix) fixesAvailable++;
    }
  }

  return {
    filesScanned: files.length,
    filesWithIssues,
    totalIssues,
    byDimension,
    errors,
    warnings,
    fixesAvailable,
  };
}

/**
 * Split files into batches that fit within the LLM context window.
 */
function batchFiles(files: CollectedFile[]): CollectedFile[][] {
  const batches: CollectedFile[][] = [];
  let current: CollectedFile[] = [];
  let currentSize = 0;

  for (const file of files) {
    const size = file.content.length + file.path.length + 20;
    if (currentSize + size > MAX_BATCH_CHARS && current.length > 0) {
      batches.push(current);
      current = [];
      currentSize = 0;
    }
    current.push(file);
    currentSize += size;
  }

  if (current.length > 0) batches.push(current);
  return batches;
}

const VALID_DIMENSIONS = new Set<string>([
  "palette",
  "spacing",
  "typography",
  "surfaces",
]);
const VALID_SEVERITIES = new Set<string>(["error", "warning", "info"]);

/**
 * Parse and validate the LLM's JSON response.
 */
function parseResponse(
  text: string,
  files: CollectedFile[],
  config?: ReviewConfig,
): ReviewFileResult[] {
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    // LLM returned no JSON array — could be empty result or error
    return files.map((f) => ({ file: f.path, issues: [], deepReviewed: true }));
  }

  let rawIssues: unknown[];
  try {
    rawIssues = JSON.parse(jsonMatch[0]);
  } catch {
    return files.map((f) => ({ file: f.path, issues: [], deepReviewed: true }));
  }

  if (!Array.isArray(rawIssues)) {
    return files.map((f) => ({ file: f.path, issues: [], deepReviewed: true }));
  }

  const fileMap = new Map(files.map((f) => [f.path, f]));
  const issuesByFile = new Map<string, ReviewIssue[]>();

  for (const f of files) {
    issuesByFile.set(f.path, []);
  }

  for (const raw of rawIssues) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;

    const filePath = r.file as string;
    const file = fileMap.get(filePath);
    if (!file) continue;

    const line = Number(r.line);
    const lineCount = file.content.split("\n").length;
    if (!Number.isFinite(line) || line < 1 || line > lineCount) continue;

    // changedLines filtering
    if (
      config?.changedLinesOnly !== false &&
      file.changedLines &&
      !file.changedLines.has(line)
    ) {
      continue;
    }

    const dimension = r.dimension as string;
    if (!VALID_DIMENSIONS.has(dimension)) continue;

    // Dimension filtering
    if (config?.dimensions) {
      const dimKey = dimension as keyof NonNullable<ReviewConfig["dimensions"]>;
      if (config.dimensions[dimKey] === false) continue;
    }

    const severity = r.severity as string;
    if (!VALID_SEVERITIES.has(severity)) continue;

    if (typeof r.message !== "string" || !r.message) continue;
    if (typeof r.found !== "string") continue;

    const issue: ReviewIssue = {
      rule: typeof r.rule === "string" ? r.rule : "drift",
      dimension: dimension as ReviewDimension,
      severity: severity as ReviewSeverity,
      message: r.message as string,
      file: filePath,
      line,
      found: r.found as string,
      phase: "deep",
    };

    if (typeof r.nearest === "string") issue.nearest = r.nearest;
    if (typeof r.nearestRole === "string") issue.nearestRole = r.nearestRole;
    if (typeof r.column === "number") issue.column = r.column;

    // Get the actual source line
    const sourceLines = file.content.split("\n");
    if (line <= sourceLines.length) {
      issue.source = sourceLines[line - 1];
    }

    if (r.fix && typeof r.fix === "object") {
      const fix = r.fix as Record<string, unknown>;
      if (
        typeof fix.replacement === "string" &&
        typeof fix.description === "string"
      ) {
        issue.fix = {
          replacement: fix.replacement,
          description: fix.description,
        };
      }
    }

    issuesByFile.get(filePath)!.push(issue);
  }

  return files.map((f) => ({
    file: f.path,
    issues: issuesByFile.get(f.path)!.sort((a, b) => a.line - b.line),
    deepReviewed: true,
  }));
}

/**
 * Run a fingerprint-informed design review.
 *
 * Sends the design fingerprint + source files to the LLM.
 * The fingerprint IS the rule set. The LLM IS the reviewer.
 */
export async function review(options: ReviewOptions): Promise<ReviewReport> {
  const startTime = Date.now();
  const cwd = options.cwd ?? process.cwd();

  const fingerprint = await resolveFingerprint(options, cwd);
  const llmConfig = resolveLLMConfig(options);
  const provider = createProvider(llmConfig);

  // Collect files
  let collected: CollectedFile[];
  if (options.files && options.files.length > 0) {
    collected = await collectFiles(options.files, cwd);
  } else {
    const diff = options.diff ?? {};
    collected = await collectGitDiff({
      cwd,
      base: diff.base,
      staged: diff.staged,
    });
  }

  if (collected.length === 0) {
    return {
      timestamp: new Date().toISOString(),
      fingerprint: fingerprint.id,
      files: [],
      summary: computeSummary([]),
      duration: Date.now() - startTime,
    };
  }

  // Batch and send to LLM
  const batches = batchFiles(collected);
  const allFileResults: ReviewFileResult[] = [];

  for (const batch of batches) {
    const prompt = buildReviewPrompt(
      fingerprint,
      batch.map((f) => ({ path: f.path, content: f.content })),
    );

    const response = await provider.chat!(
      [{ role: "user", content: prompt }],
      [],
    );

    const text = response.content ?? "";
    const fileResults = parseResponse(text, batch, options.config);
    allFileResults.push(...fileResults);
  }

  return {
    timestamp: new Date().toISOString(),
    fingerprint: fingerprint.id,
    files: allFileResults,
    summary: computeSummary(allFileResults),
    duration: Date.now() - startTime,
  };
}
