import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { walkDirectory } from "../../extractors/walker.js";
import type { AgentTool, ToolContext, ToolResult } from "./types.js";

const MAX_RESULT_SIZE = 8000;

/**
 * search_files — search across all source directories for files matching a pattern.
 *
 * The LLM uses this when it needs more design signal files
 * that weren't included in the initial sample.
 */
export const searchFilesTool: AgentTool = {
  name: "search_files",
  description:
    "Search all source directories for files matching a keyword pattern. Returns file contents for matching files. Use when the initial sample is missing design tokens, theme files, or specific configuration.",
  parameters: {
    type: "object",
    properties: {
      pattern: {
        type: "string",
        description:
          "Keyword or glob pattern to match file paths (e.g., 'spacing', 'tokens', '*.theme.ts', 'Color.swift')",
      },
      source: {
        type: "string",
        description:
          "Optional source label to scope the search (e.g., 'npm:@arcade/tokens')",
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

    const sourceFilter = args.source ? String(args.source) : undefined;

    try {
      const dirs = sourceFilter
        ? ctx.sourceDirs.filter((s) => s.label === sourceFilter)
        : ctx.sourceDirs;

      const keyword = pattern.toLowerCase();
      const allMatches: { label: string; dir: string; path: string }[] = [];

      for (const src of dirs) {
        const files = await walkDirectory(src.dir);
        for (const f of files) {
          if (f.path.toLowerCase().includes(keyword)) {
            allMatches.push({ label: src.label, dir: src.dir, path: f.path });
          }
        }
      }

      if (allMatches.length === 0) {
        return {
          content: `No files matching "${pattern}" found.`,
          metadata: { matchCount: 0 },
        };
      }

      // Read up to 5 matching files, respecting size budget
      const results: string[] = [];
      let totalSize = 0;
      const showLabels = ctx.sourceDirs.length > 1;

      for (const match of allMatches.slice(0, 5)) {
        if (totalSize > MAX_RESULT_SIZE) break;
        try {
          const fullPath = join(match.dir, match.path);
          const content = await readFile(fullPath, "utf-8");
          const truncated =
            content.length > 3000
              ? `${content.slice(0, 3000)}\n... (truncated)`
              : content;
          const header = showLabels
            ? `[${match.label}] ${match.path}`
            : match.path;
          results.push(`--- ${header} ---\n${truncated}`);
          totalSize += truncated.length;
        } catch {
          // Skip unreadable files
        }
      }

      return {
        content: `Found ${allMatches.length} file(s) matching "${pattern}":\n\n${results.join("\n\n")}`,
        metadata: { matchCount: allMatches.length },
      };
    } catch (err) {
      return {
        content: `Search error: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
