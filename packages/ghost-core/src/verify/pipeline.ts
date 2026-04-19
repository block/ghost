import { generate } from "../generate/index.js";
import type { Expression, LLMConfig } from "../types.js";
import {
  aggregate,
  type PromptResult,
  type VerifyAggregate,
} from "./aggregate.js";
import {
  loadPromptSuite,
  type PromptSuite,
  type SuitePrompt,
} from "./suite.js";

export interface VerifyOptions {
  expression: Expression;
  /** Prompt suite to run. Defaults to bundled v0.1. */
  suite?: PromptSuite;
  /** Subsample n prompts (from the start). If absent, runs all. */
  n?: number;
  /** Max in-flight generate+review calls. Default 3. */
  concurrency?: number;
  /** Retries passed through to `generate` per prompt. Default 1. */
  retries?: number;
  /** LLM config; falls back to env. */
  llmConfig?: LLMConfig;
  /** Called once per prompt as it completes. */
  onProgress?: (result: PromptResult, done: number, total: number) => void;
}

export async function verify(options: VerifyOptions): Promise<VerifyAggregate> {
  const suite = options.suite ?? (await loadPromptSuite());
  const concurrency = Math.max(1, options.concurrency ?? 3);
  const retries = options.retries ?? 1;

  const selected =
    options.n !== undefined && options.n > 0
      ? suite.prompts.slice(0, options.n)
      : suite.prompts;

  const results = new Array<PromptResult>(selected.length);
  let done = 0;
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (true) {
      const i = nextIndex++;
      if (i >= selected.length) return;
      const p = selected[i];
      results[i] = await runOne(
        p,
        options.expression,
        retries,
        options.llmConfig,
      );
      done++;
      options.onProgress?.(results[i], done, selected.length);
    }
  }

  const workers: Promise<void>[] = [];
  for (let i = 0; i < Math.min(concurrency, selected.length); i++) {
    workers.push(worker());
  }
  await Promise.all(workers);

  return aggregate(results);
}

async function runOne(
  p: SuitePrompt,
  expression: Expression,
  retries: number,
  llmConfig?: LLMConfig,
): Promise<PromptResult> {
  const start = Date.now();
  try {
    const result = await generate({
      expression,
      userPrompt: p.prompt,
      format: "html",
      selfReview: true,
      retries,
      llmConfig,
    });
    return {
      id: p.id,
      prompt: p.prompt,
      dimensions: p.dimensions,
      tier: p.tier,
      review: result.reviewReport,
      passed: result.passed,
      attempts: result.attempts.length,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return {
      id: p.id,
      prompt: p.prompt,
      dimensions: p.dimensions,
      tier: p.tier,
      passed: false,
      attempts: 0,
      errorMessage: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - start,
    };
  }
}
