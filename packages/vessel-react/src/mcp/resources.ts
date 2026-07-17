import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getRegistryRaw, getSkills } from "./data.js";

export function registerResources(server: McpServer): void {
  server.resource(
    "ghost UI Registry",
    "ghost://registry",
    { mimeType: "application/json" },
    async () => ({
      contents: [
        {
          uri: "ghost://registry",
          mimeType: "application/json",
          text: getRegistryRaw(),
        },
      ],
    }),
  );

  server.resource(
    "ghost UI Skills",
    "ghost://skills",
    { mimeType: "text/markdown" },
    async () => ({
      contents: [
        {
          uri: "ghost://skills",
          mimeType: "text/markdown",
          text: getSkills(),
        },
      ],
    }),
  );
}
