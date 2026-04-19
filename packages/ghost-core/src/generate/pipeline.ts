import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createProvider } from "../llm/index.js";
import { review } from "../review/pipeline.js";
import type { Expression, LLMConfig, ReviewReport } from "../types.js";
import { extractHtml } from "./parser.js";
import { buildGenerationPrompt, type GenerateFormat } from "./prompts.js";

/** Hard cap on retries. User --retries is clamped against this. */
const MAX_RETRIES_HARD_CAP = 3;

export interface GenerateOptions {
  fingerprint: Expression;
  /** What to build, e.g. "a pricing page with three tiers". */
  userPrompt: string;
  /** Output format. Only "html" supported in Phase B. */
  format?: GenerateFormat;
  /** Self-review with `review()` and retry on drift. Default: true. */
  selfReview?: boolean;
  /** Max retries after initial attempt. Default 2, clamped to MAX_RETRIES_HARD_CAP. */
  retries?: number;
  /** LLM config. Defaults to ANTHROPIC_API_KEY / OPENAI_API_KEY env fallback. */
  llmConfig?: LLMConfig;
}

export interface GenerateAttempt {
  /** 1-indexed attempt number. */
  attempt: number;
  artifact: string;
  reviewReport?: ReviewReport;
}

export interface GenerateResult {
  /** Final artifact (from the last attempt). */
  artifact: string;
  /** All attempts in order, for observability. */
  attempts: GenerateAttempt[];
  /** Review report from the final attempt (if selfReview was enabled). */
  reviewReport?: ReviewReport;
  /** True when the final attempt passed review (or selfReview was off). */
  passed: boolean;
}

export async function generate(
  options: GenerateOptions,
): Promise<GenerateResult> {
  const format = options.format ?? "html";
  const selfReview = options.selfReview ?? true;
  const retries = Math.min(
    Math.max(0, options.retries ?? 2),
    MAX_RETRIES_HARD_CAP,
  );
  const llmConfig = resolveLLMConfig(options);
  const provider = createProvider(llmConfig);
  if (!provider.chat) {
    throw new Error(
      "LLM provider does not support chat. Use anthropic or openai.",
    );
  }

  const attempts: GenerateAttempt[] = [];
  let lastReview: ReviewReport | undefined;

  for (let i = 0; i <= retries; i++) {
    const prompt = buildGenerationPrompt({
      fingerprint: options.fingerprint,
      userPrompt: options.userPrompt,
      format,
      retryFeedback: lastReview,
    });

    const response = await provider.chat(
      [{ role: "user", content: prompt }],
      [],
    );
    const text = response.content ?? "";
    const artifact = extractHtml(text);

    let reviewReport: ReviewReport | undefined;
    if (selfReview) {
      reviewReport = await reviewArtifact(
        artifact,
        options.fingerprint,
        format,
      );
    }

    attempts.push({ attempt: i + 1, artifact, reviewReport });

    if (!selfReview || !reviewReport || reviewReport.summary.errors === 0) {
      return {
        artifact,
        attempts,
        reviewReport,
        passed: !selfReview || (reviewReport?.summary.errors ?? 0) === 0,
      };
    }

    lastReview = reviewReport;
  }

  const final = attempts[attempts.length - 1];
  return {
    artifact: final.artifact,
    attempts,
    reviewReport: final.reviewReport,
    passed: false,
  };
}

async function reviewArtifact(
  artifact: string,
  fingerprint: Expression,
  format: GenerateFormat,
): Promise<ReviewReport> {
  const dir = await mkdtemp(join(tmpdir(), "ghost-generate-"));
  const file = join(dir, `artifact.${format}`);
  try {
    await writeFile(file, artifact, "utf-8");
    return await review({
      files: [file],
      cwd: dir,
      fingerprint,
      config: { changedLinesOnly: false },
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function resolveLLMConfig(options: GenerateOptions): LLMConfig {
  if (options.llmConfig) return options.llmConfig;
  const ak = process.env.ANTHROPIC_API_KEY;
  if (ak) return { provider: "anthropic", apiKey: ak };
  const ok = process.env.OPENAI_API_KEY;
  if (ok) return { provider: "openai", apiKey: ok };
  throw new Error(
    "ghost generate requires an LLM API key. Set ANTHROPIC_API_KEY or OPENAI_API_KEY.",
  );
}
