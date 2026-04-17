import { walkDirectory } from "../../extractors/walker.js";
import type { AgentTool, ToolContext, ToolResult } from "./types.js";

/**
 * list_files — list available files across all source directories.
 *
 * The LLM uses this to explore the project structure when the
 * initial sample doesn't provide enough context.
 */
export const listFilesTool: AgentTool = {
  name: "list_files",
  description:
    "List files across all source directories, optionally filtered by keyword or scoped to a specific source. Shows file paths with source labels and types.",
  parameters: {
    type: "object",
    properties: {
      filter: {
        type: "string",
        description:
          "Optional keyword to filter file paths (e.g., 'theme', 'color', 'token')",
      },
      source: {
        type: "string",
        description:
          "Optional source label to scope the listing to one source (e.g., 'npm:@arcade/tokens')",
      },
    },
    required: [],
  },

  async execute(
    args: Record<string, unknown>,
    ctx: ToolContext,
  ): Promise<ToolResult> {
    const filter = args.filter ? String(args.filter).toLowerCase() : undefined;
    const sourceFilter = args.source ? String(args.source) : undefined;

    try {
      const dirs = sourceFilter
        ? ctx.sourceDirs.filter((s) => s.label === sourceFilter)
        : ctx.sourceDirs;

      if (dirs.length === 0) {
        const available = ctx.sourceDirs.map((s) => s.label).join(", ");
        return {
          content: `Source "${sourceFilter}" not found. Available sources: ${available}`,
        };
      }

      const allEntries: { label: string; path: string; type: string }[] = [];

      for (const src of dirs) {
        const files = await walkDirectory(src.dir);
        for (const f of files) {
          allEntries.push({ label: src.label, path: f.path, type: f.type });
        }
      }

      const filtered = filter
        ? allEntries.filter((f) => f.path.toLowerCase().includes(filter))
        : allEntries;

      const showLabels = ctx.sourceDirs.length > 1;
      const listing = filtered
        .slice(0, 100)
        .map((f) => `${showLabels ? `[${f.label}] ` : ""}${f.path} [${f.type}]`)
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
