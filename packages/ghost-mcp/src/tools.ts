import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  getCategoriesWithCounts,
  getComponentSource,
  getRegistryItem,
  getThemePreset,
  searchItems,
} from "./data.js";

const REGISTRY_URL = "https://block.github.io/ghost/r/registry.json";

export function registerTools(server: McpServer): void {
  server.tool(
    "search_components",
    "Search Ghost UI components by name, category, or AI filter",
    {
      query: z
        .string()
        .optional()
        .describe("Substring to match against component names"),
      category: z
        .string()
        .optional()
        .describe("Filter by category (e.g. input, layout, ai)"),
      aiOnly: z
        .boolean()
        .optional()
        .describe("Only return AI-category components"),
    },
    async ({ query, category, aiOnly }) => {
      const results = searchItems(query, category, aiOnly);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(results, null, 2),
          },
        ],
      };
    },
  );

  server.tool(
    "get_component",
    "Get full metadata and source code for a Ghost UI component",
    {
      name: z.string().describe("Component name from the registry"),
    },
    async ({ name }) => {
      const item = getRegistryItem(name);
      if (!item) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: `Component "${name}" not found` }),
            },
          ],
        };
      }
      const source = getComponentSource(name);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ ...item, source }, null, 2),
          },
        ],
      };
    },
  );

  server.tool(
    "get_install_command",
    "Generate a shadcn install command for Ghost UI components",
    {
      components: z
        .array(z.string())
        .describe("Array of component names to install"),
    },
    async ({ components }) => {
      const cmd = `npx shadcn@latest add --registry ${REGISTRY_URL} ${components.join(" ")}`;
      return {
        content: [{ type: "text" as const, text: cmd }],
      };
    },
  );

  server.tool(
    "list_categories",
    "List all Ghost UI component categories with counts",
    {},
    async () => {
      const categories = getCategoriesWithCounts();
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(categories, null, 2),
          },
        ],
      };
    },
  );

  server.tool(
    "review_files",
    "Review files for visual language drift against a design fingerprint. Returns the CLI command to run — the review itself is executed via the ghost CLI, not this MCP server.",
    {
      files: z
        .array(z.string())
        .optional()
        .describe("File paths to review (omit for git diff)"),
      deep: z
        .boolean()
        .optional()
        .describe("Enable LLM-powered deep review"),
      fingerprint: z
        .string()
        .optional()
        .describe("Path to fingerprint JSON file"),
      dimensions: z
        .string()
        .optional()
        .describe("Comma-separated dimensions: palette,spacing,typography,surfaces"),
      format: z
        .enum(["cli", "json", "github"])
        .optional()
        .describe("Output format"),
    },
    async ({ files, deep, fingerprint, dimensions, format }) => {
      const parts = ["ghost", "review"];
      if (files && files.length > 0) parts.push(files.join(","));
      if (deep) parts.push("--deep");
      if (fingerprint) parts.push("--fingerprint", fingerprint);
      if (dimensions) parts.push("--dimensions", dimensions);
      if (format) parts.push("--format", format);

      const cmd = parts.join(" ");
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              command: cmd,
              description:
                "Run this command to review files for visual language drift against the design fingerprint. Requires .ghost-fingerprint.json in the project (generate with: ghost profile . --emit).",
            }),
          },
        ],
      };
    },
  );

  server.tool(
    "get_theme",
    "Get CSS variables for a Ghost UI theme preset",
    {
      name: z.string().describe("Theme preset name"),
    },
    async ({ name }) => {
      const cssVars = getThemePreset(name);
      if (!cssVars) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: `Theme "${name}" not found`,
              }),
            },
          ],
        };
      }
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(cssVars, null, 2),
          },
        ],
      };
    },
  );
}
