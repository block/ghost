import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  searchItems,
  getRegistryItem,
  getComponentSource,
  getCategoriesWithCounts,
  getThemePreset,
} from "./data.js";

const REGISTRY_URL =
  "https://block.github.io/ghost/r/registry.json";

export function registerTools(server: McpServer): void {
  server.tool(
    "search_components",
    "Search Ghost UI components by name, category, or AI filter",
    {
      query: z.string().optional().describe("Substring to match against component names"),
      category: z.string().optional().describe("Filter by category (e.g. input, layout, ai)"),
      aiOnly: z.boolean().optional().describe("Only return AI-category components"),
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
