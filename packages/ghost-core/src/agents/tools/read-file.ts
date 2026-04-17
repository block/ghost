import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { AgentTool, ToolContext, ToolResult } from "./types.js";

const MAX_FILE_SIZE = 20_000;

/**
 * read_file — read a specific file from any source directory.
 *
 * The LLM uses this when it has discovered a file via list_files or
 * search_files and wants to read its full contents.
 */
export const readFileTool: AgentTool = {
  name: "read_file",
  description:
    "Read the full contents of a specific file. Provide the file path as shown by list_files or search_files. For multi-source projects, optionally specify which source to read from.",
  parameters: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description:
          "File path relative to the source directory (e.g., 'src/tokens/colors.ts')",
      },
      source: {
        type: "string",
        description:
          "Source label when multiple sources exist (e.g., 'npm:@arcade/tokens'). If omitted, searches all sources.",
      },
    },
    required: ["path"],
  },

  async execute(
    args: Record<string, unknown>,
    ctx: ToolContext,
  ): Promise<ToolResult> {
    const filePath = String(args.path ?? "");
    if (!filePath) {
      return { content: "Error: path is required" };
    }

    const sourceFilter = args.source ? String(args.source) : undefined;
    const dirs = sourceFilter
      ? ctx.sourceDirs.filter((s) => s.label === sourceFilter)
      : ctx.sourceDirs;

    // Try each source directory until we find the file
    for (const src of dirs) {
      try {
        const fullPath = join(src.dir, filePath);
        const content = await readFile(fullPath, "utf-8");
        const showLabel = ctx.sourceDirs.length > 1;
        const header = showLabel ? `[${src.label}] ${filePath}` : filePath;

        const truncated =
          content.length > MAX_FILE_SIZE
            ? `${content.slice(0, MAX_FILE_SIZE)}\n... (truncated, ${content.length} chars total)`
            : content;

        return {
          content: `--- ${header} ---\n${truncated}`,
          metadata: { source: src.label, size: content.length },
        };
      } catch {
        // File not found in this source, try next
      }
    }

    const available = ctx.sourceDirs.map((s) => s.label).join(", ");
    return {
      content: `File "${filePath}" not found in any source directory. Available sources: ${available}`,
    };
  },
};
