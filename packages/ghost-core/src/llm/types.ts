/**
 * Provider-neutral chat + tool types shared by the Anthropic and OpenAI
 * adapters. Kept here (rather than in the top-level types module) because
 * they describe the LLM surface, not the domain model.
 */

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

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: ToolParameters;
}

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface ChatMessage {
  role: "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}

export interface ChatResponse {
  content?: string;
  tool_calls?: ToolCall[];
  stop_reason?: string;
}
