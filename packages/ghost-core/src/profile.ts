import { relative } from "node:path";
import { runExpressionAgent } from "./agents/expression-agent.js";
import { resolveTarget } from "./config.js";
import { emitExpression } from "./evolution/emit.js";
import { appendHistory } from "./evolution/history.js";
import { stageTargets } from "./extractors/stage.js";
import type {
  EnrichedExpression,
  Expression,
  GhostConfig,
  Target,
} from "./types.js";

export interface ProfileOptions {
  cwd?: string;
  emit?: boolean;
}

export interface ProfileTargetResult {
  expression: EnrichedExpression;
  confidence: number;
  reasoning: string[];
  warnings: string[];
}

export interface ProfileResult {
  expression: Expression;
}

/**
 * Profile the current project — extract design material and produce an expression.
 *
 * AI-only: requires config.llm.
 */
export async function profile(
  config: GhostConfig,
  cwdOrOptions: string | ProfileOptions = {},
): Promise<Expression> {
  const opts =
    typeof cwdOrOptions === "string" ? { cwd: cwdOrOptions } : cwdOrOptions;
  const cwd = opts.cwd ?? process.cwd();

  const result = await profileTargets([{ type: "path", value: cwd }], config);
  const expression = result.expression;

  if (opts.emit) {
    await emitExpression(expression, cwd);
  }

  await appendHistory({ expression, parentRef: config.parent }, cwd);

  return expression;
}

/**
 * Profile one or more targets with a single Agent SDK run.
 *
 * Single local path → agent runs against it directly.
 * Single remote (github/npm/url) → materialized to a temp dir, agent runs there.
 * N targets → materialized into sibling subdirs under one staging root;
 *             the agent explores every subdirectory and synthesizes one
 *             coherent expression.
 */
export async function profileTargets(
  targetsOrStrings: (Target | string)[],
  config: GhostConfig,
): Promise<ProfileTargetResult> {
  if (!config.llm) {
    throw new Error(
      "Ghost is AI-only. Configure an LLM provider (set ANTHROPIC_API_KEY or OPENAI_API_KEY, or llm in ghost.config.ts).",
    );
  }

  const targets = targetsOrStrings.map((t) =>
    typeof t === "string" ? resolveTarget(t) : t,
  );

  const staged = await stageTargets(targets);
  const projectId = inferProjectId(targets);

  const result = await runExpressionAgent({
    targetDir: staged.cwd,
    targetType: targets[0].type,
    projectId,
    sources: staged.sources.map((s) => ({
      label: s.label,
      subdir:
        staged.staged && staged.sources.length > 1
          ? relative(staged.cwd, s.dir)
          : undefined,
    })),
    verbose: config.agents?.verbose ?? true,
    embedding: config.embedding,
  });

  return {
    expression: result.data,
    confidence: result.confidence,
    reasoning: result.reasoning,
    warnings: result.warnings,
  };
}

/**
 * Profile a single target. Thin wrapper over profileTargets for back-compat
 * and CLI ergonomics.
 */
export async function profileTarget(
  targetOrString: Target | string,
  config: GhostConfig,
): Promise<ProfileTargetResult> {
  return profileTargets([targetOrString], config);
}

function inferProjectId(targets: Target[]): string {
  if (targets.length === 1) {
    const t = targets[0];
    if (t.name) return t.name;
    if (t.type === "path") {
      const parts = t.value.split("/").filter(Boolean);
      return parts[parts.length - 1] ?? "project";
    }
    return t.value.split("/").pop() ?? "project";
  }
  return (
    targets.find((t) => t.name)?.name ??
    targets.map((t) => t.name ?? t.value.split("/").pop()).join("+")
  );
}
