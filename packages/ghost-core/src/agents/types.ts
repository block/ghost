import type { AgentContext, AgentMessage, AgentResult } from "../types.js";

export interface AgentState<T> {
  messages: AgentMessage[];
  result?: T;
  confidence: number;
  status: "running" | "completed" | "failed" | "needs-input";
  iterations: number;
  reasoning: string[];
  warnings: string[];
}

export interface Agent<TInput, TOutput> {
  name: string;
  maxIterations: number;
  systemPrompt: string;
  execute(
    input: TInput,
    ctx: AgentContext,
  ): Promise<AgentResult<TOutput>>;
}

export type { AgentContext, AgentMessage, AgentResult };
