import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { walkDirectory } from "../../extractors/walker.js";
import type { AgentTool, ToolContext, ToolResult } from "./types.js";

const MAX_RESULT_SIZE = 8000;

/**
 * search_files — search the project for files matching a pattern.
 *
 * The LLM uses this when it needs more design signal files
 * that weren't included in the initial sample.
 */
export const searchFilesTool: AgentTool = {
  name: "search_files",
  description:
    "Search the project directory for files matching a glob or keyword pattern. Returns file contents for matching files. Use when the initial sample is missing design tokens, theme files, or specific configuration.",
  parameters: {
    type: "object",
    properties: {
      pattern: {
        type: "string",
        description:
          "Keyword or glob pattern to match file paths (e.g., 'spacing', 'tokens', '*.theme.ts', 'Color.swift')",
      },
      reason: {
        type: "string",
        description: "Why you need these files (for logging)",
      },
    },
    required: ["pattern"],
  },

  async execute(
    args: Record<string, unknown>,
    ctx: ToolContext,
  ): Promise<ToolResult> {
    const pattern = String(args.pattern ?? "");
    if (!pattern) {
      return { content: "Error: pattern is required" };
    }

    try {
      const allFiles = await walkDirectory(ctx.sourceDir);
      const keyword = pattern.toLowerCase();

      const matches = allFiles.filter((f) =>
        f.path.toLowerCase().includes(keyword),
      );

      if (matches.length === 0) {
        return {
          content: `No files matching "${pattern}" found.`,
          metadata: { matchCount: 0 },
        };
      }

      // Read up to 5 matching files, respecting size budget
      const results: string[] = [];
      let totalSize = 0;

      for (const file of matches.slice(0, 5)) {
        if (totalSize > MAX_RESULT_SIZE) break;
        try {
          const fullPath = join(ctx.sourceDir, file.path);
          const content = await readFile(fullPath, "utf-8");
          const truncated =
            content.length > 3000
              ? `${content.slice(0, 3000)}\n... (truncated)`
              : content;
          results.push(`--- ${file.path} ---\n${truncated}`);
          totalSize += truncated.length;
        } catch {
          // Skip unreadable files
        }
      }

      return {
        content: `Found ${matches.length} file(s) matching "${pattern}":\n\n${results.join("\n\n")}`,
        metadata: { matchCount: matches.length },
      };
    } catch (err) {
      return {
        content: `Search error: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
