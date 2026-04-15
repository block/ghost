import { walkDirectory } from "../../extractors/walker.js";
import type { AgentTool, ToolContext, ToolResult } from "./types.js";

/**
 * list_files — list available files in the project directory.
 *
 * The LLM uses this to explore the project structure when the
 * initial sample doesn't provide enough context.
 */
export const listFilesTool: AgentTool = {
  name: "list_files",
  description:
    "List files in the project directory, optionally filtered by keyword. Shows file paths and types. Use to understand project structure before requesting specific files.",
  parameters: {
    type: "object",
    properties: {
      filter: {
        type: "string",
        description:
          "Optional keyword to filter file paths (e.g., 'theme', 'color', 'token')",
      },
    },
    required: [],
  },

  async execute(
    args: Record<string, unknown>,
    ctx: ToolContext,
  ): Promise<ToolResult> {
    const filter = args.filter ? String(args.filter).toLowerCase() : undefined;

    try {
      const allFiles = await walkDirectory(ctx.sourceDir);

      const filtered = filter
        ? allFiles.filter((f) => f.path.toLowerCase().includes(filter))
        : allFiles;

      const listing = filtered
        .slice(0, 100)
        .map((f) => `${f.path} [${f.type}]`)
        .join("\n");

      return {
        content: `${filtered.length} file(s)${filter ? ` matching "${filter}"` : ""}:\n${listing}${filtered.length > 100 ? `\n... and ${filtered.length - 100} more` : ""}`,
        metadata: { totalFiles: filtered.length },
      };
    } catch (err) {
      return {
        content: `Error listing files: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
