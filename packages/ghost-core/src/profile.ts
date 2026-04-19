import { resolve } from "node:path";
import { resolveTarget } from "./config.js";
import { computeSemanticEmbedding } from "./embedding/embed-api.js";
import { computeEmbedding } from "./embedding/embedding.js";
import { fingerprintFromRegistry } from "./embedding/from-registry.js";
import { emitFingerprint } from "./evolution/emit.js";
import { appendHistory } from "./evolution/history.js";
import type { ExpressionValidation } from "./llm/validate-expression.js";
import { resolveRegistry } from "./resolvers/registry.js";
import type {
  EmbeddingConfig,
  EnrichedExpression,
  Expression,
  GhostConfig,
  Target,
} from "./types.js";

export interface ProfileOptions {
  cwd?: string;
  emit?: boolean;
  registry?: string;
}

export interface ProfileTargetResult {
  fingerprint: EnrichedExpression;
  confidence: number;
  reasoning: string[];
  warnings: string[];
}

export interface ProfileResult {
  fingerprint: Expression;
  validation?: ExpressionValidation;
}

/**
 * Compute the embedding for a fingerprint.
 * Uses semantic embedding API if configured, otherwise falls back to deterministic.
 */
async function embedFingerprint(
  fingerprint: Expression,
  embeddingConfig?: EmbeddingConfig,
): Promise<number[]> {
  if (embeddingConfig) {
    return computeSemanticEmbedding(fingerprint, embeddingConfig);
  }
  return computeEmbedding(fingerprint);
}

/**
 * Profile a repository — extract design material and produce a fingerprint.
 *
 * AI-only: requires config.llm. For deterministic registry-to-fingerprint
 * (shadcn-style), pass `registry` in options or use profileRegistry directly.
 */
export async function profile(
  config: GhostConfig,
  cwdOrOptions: string | ProfileOptions = {},
): Promise<Expression> {
  const opts =
    typeof cwdOrOptions === "string" ? { cwd: cwdOrOptions } : cwdOrOptions;
  const cwd = opts.cwd ?? process.cwd();

  // Explicit registry path takes the deterministic registry-to-fingerprint path
  // (a separate feature — not a fallback).
  if (opts.registry) {
    return profileRegistry(opts.registry, config.embedding);
  }

  if (!config.llm) {
    throw new Error(
      "Ghost is AI-only. Configure an LLM provider (set ANTHROPIC_API_KEY or OPENAI_API_KEY, or llm in ghost.config.ts).",
    );
  }

  const result = await profileTarget({ type: "path", value: cwd }, config);
  const fingerprint = result.fingerprint;

  if (opts.emit) {
    await emitFingerprint(fingerprint, cwd);
  }

  await appendHistory(
    {
      fingerprint,
      parentRef: config.parent,
    },
    cwd,
  );

  return fingerprint;
}

/**
 * Profile a registry deterministically — no LLM needed.
 * Registry-to-fingerprint is a distinct feature for shadcn-style registries
 * (not a fallback for source-code profiling).
 */
export async function profileRegistry(
  registryPath: string,
  embeddingConfig?: EmbeddingConfig,
): Promise<Expression> {
  const registry = await resolveRegistry(registryPath);
  const fingerprint = fingerprintFromRegistry(registry);
  fingerprint.embedding = await embedFingerprint(fingerprint, embeddingConfig);
  return fingerprint;
}

/**
 * Profile any target using the LLM-first agent pipeline.
 *
 * Accepts a Target object or a string (auto-resolved via resolveTarget).
 * The agent explores the filesystem with Read/Glob/Grep tools to find and
 * extract the visual language — no upfront sampling, no deterministic fallback.
 */
export async function profileTarget(
  targetOrString: Target | string,
  config?: GhostConfig,
): Promise<ProfileTargetResult> {
  const { runExpressionAgent } = await import("./agents/expression-agent.js");

  const target =
    typeof targetOrString === "string"
      ? resolveTarget(targetOrString)
      : targetOrString;

  if (target.type !== "path") {
    throw new Error(
      `Agent SDK profiling only supports local paths (got ${target.type})`,
    );
  }

  const targetDir = resolve(process.cwd(), target.value);
  const projectId = target.name ?? target.value.split("/").pop() ?? "project";

  const result = await runExpressionAgent({
    targetDir,
    targetType: target.type,
    projectId,
    verbose: config?.agents?.verbose ?? true,
    embedding: config?.embedding,
  });

  return {
    fingerprint: result.data,
    confidence: result.confidence,
    reasoning: result.reasoning,
    warnings: result.warnings,
  };
}

/**
 * Profile multiple targets into a single unified fingerprint.
 *
 * Materializes all targets, samples across them, and lets the fingerprint
 * agent explore every source directory via its tools to synthesize one
 * coherent fingerprint.
 *
 * Usage:
 *   ghost profile npm:@arcade/tokens github:cashapp/arcade-ios ./local-impl
 */
export async function profileMultiTarget(
  targets: Target[],
  config?: GhostConfig,
  options?: { maxIterations?: number },
): Promise<ProfileTargetResult> {
  const { Director } = await import("./agents/director.js");

  if (!config?.llm) {
    throw new Error(
      "Ghost is AI-only. Configure an LLM provider to profile targets.",
    );
  }

  const ctx = {
    llm: config.llm,
    embedding: config.embedding,
    verbose: config.agents?.verbose,
    maxIterations: options?.maxIterations ?? config.agents?.maxIterations,
  };

  const director = new Director();
  const result = await director.profile(targets, ctx);

  return {
    fingerprint: result.fingerprint.data,
    confidence: result.fingerprint.confidence,
    reasoning: [
      ...result.extraction.reasoning,
      ...result.fingerprint.reasoning,
    ],
    warnings: [...result.extraction.warnings, ...result.fingerprint.warnings],
  };
}
