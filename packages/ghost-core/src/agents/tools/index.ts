import { listFilesTool } from "./list-files.js";
import { readFileTool } from "./read-file.js";
import { runExtractorTool } from "./run-extractor.js";
import { searchFilesTool } from "./search-files.js";
import type {
  AgentTool,
  ToolCall,
  ToolContext,
  ToolDefinition,
  ToolResult,
} from "./types.js";

export type {
  AgentTool,
  ChatMessage,
  ChatResponse,
  ToolCall,
  ToolContext,
  ToolDefinition,
  ToolResult,
} from "./types.js";

/** All available fingerprint agent tools. */
export const FINGERPRINT_TOOLS: AgentTool[] = [
  searchFilesTool,
  readFileTool,
  runExtractorTool,
  listFilesTool,
];

/** Convert tools to LLM-provider-neutral definitions. */
export function getToolDefinitions(): ToolDefinition[] {
  return FINGERPRINT_TOOLS.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.parameters,
  }));
}

/** Dispatch a tool call and return the result. */
export async function executeTool(
  call: ToolCall,
  ctx: ToolContext,
): Promise<ToolResult> {
  const tool = FINGERPRINT_TOOLS.find((t) => t.name === call.name);
  if (!tool) {
    return { content: `Unknown tool: ${call.name}` };
  }
  return tool.execute(call.args, ctx);
}

/** Default maximum number of tool calls per fingerprint run. */
export const DEFAULT_MAX_TOOL_CALLS = 50;
