import type { SampledMaterial } from "../../types.js";

/**
 * A tool the fingerprint agent can invoke during analysis.
 */
export interface AgentTool {
  name: string;
  description: string;
  parameters: ToolParameters;
  execute(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult>;
}

export interface ToolParameters {
  type: "object";
  properties: Record<
    string,
    {
      type: string;
      description: string;
      enum?: string[];
    }
  >;
  required: string[];
}

export interface ToolContext {
  /** The source directory on disk (for file access) */
  sourceDir: string;
  /** The originally sampled material */
  material: SampledMaterial;
}

export interface ToolResult {
  content: string;
  metadata?: Record<string, unknown>;
}

/** Tool definition in LLM-provider-neutral format (maps to both Anthropic and OpenAI). */
export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: ToolParameters;
}

/** A chat message in multi-turn tool-use conversation. */
export interface ChatMessage {
  role: "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface ChatResponse {
  content?: string;
  tool_calls?: ToolCall[];
  stop_reason?: string;
}
