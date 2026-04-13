import type { AgentContext, AgentMessage, AgentResult } from "../types.js";
import type { Agent, AgentState } from "./types.js";

/**
 * Base class for stateful agent loops.
 *
 * Each iteration calls `step()` which can update the state,
 * add messages, adjust confidence, and decide whether to continue.
 *
 * The agent loop continues until:
 * - status is "completed" or "failed"
 * - maxIterations is reached
 *
 * Without LLM config, agents run a single deterministic iteration.
 */
export abstract class BaseAgent<TInput, TOutput>
  implements Agent<TInput, TOutput>
{
  abstract name: string;
  abstract maxIterations: number;
  abstract systemPrompt: string;

  /**
   * Perform one iteration of the agent loop.
   * Subclasses implement their per-step logic here.
   */
  protected abstract step(
    state: AgentState<TOutput>,
    input: TInput,
    ctx: AgentContext,
  ): Promise<AgentState<TOutput>>;

  /**
   * Execute the agent loop.
   */
  async execute(
    input: TInput,
    ctx: AgentContext,
  ): Promise<AgentResult<TOutput>> {
    const startTime = Date.now();
    let state = this.initState();

    // Add system prompt
    state.messages.push({
      role: "system",
      content: this.systemPrompt,
    });

    // Notify start
    this.emit(ctx, {
      role: "assistant",
      content: `[${this.name}] Starting...`,
      metadata: { agent: this.name, event: "start" },
    });

    // Determine effective max iterations
    // Without LLM, agents run a single deterministic pass
    const effectiveMax = ctx.llm ? this.maxIterations : 1;

    while (
      state.status === "running" &&
      state.iterations < effectiveMax
    ) {
      state = await this.step(state, input, ctx);
      state.iterations++;

      this.emit(ctx, {
        role: "assistant",
        content: `[${this.name}] Iteration ${state.iterations}/${effectiveMax} — confidence: ${state.confidence.toFixed(2)}`,
        metadata: {
          agent: this.name,
          event: "iteration",
          iteration: state.iterations,
          confidence: state.confidence,
        },
      });
    }

    // If still running after all iterations, mark as completed with current state
    if (state.status === "running") {
      state.status = state.result ? "completed" : "failed";
      if (!state.result) {
        state.warnings.push(
          `Agent reached max iterations (${effectiveMax}) without producing a result`,
        );
      }
    }

    const duration = Date.now() - startTime;

    this.emit(ctx, {
      role: "assistant",
      content: `[${this.name}] ${state.status} in ${duration}ms (${state.iterations} iterations)`,
      metadata: { agent: this.name, event: "done", status: state.status },
    });

    return this.toResult(state, duration);
  }

  protected initState(): AgentState<TOutput> {
    return {
      messages: [],
      confidence: 0,
      status: "running",
      iterations: 0,
      reasoning: [],
      warnings: [],
    };
  }

  protected toResult(
    state: AgentState<TOutput>,
    duration: number,
  ): AgentResult<TOutput> {
    if (!state.result) {
      throw new Error(
        `[${this.name}] Agent completed without producing a result`,
      );
    }

    return {
      data: state.result,
      confidence: state.confidence,
      warnings: state.warnings,
      reasoning: state.reasoning,
      iterations: state.iterations,
      duration,
    };
  }

  protected emit(ctx: AgentContext, message: AgentMessage): void {
    if (ctx.verbose && ctx.onMessage) {
      ctx.onMessage(message);
    }
  }
}
