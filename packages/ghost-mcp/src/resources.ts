import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getSkills } from "./data.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const assetsDir = path.resolve(__dirname, "assets");

export function registerResources(server: McpServer): void {
  server.resource(
    "Ghost UI Registry",
    "ghost://registry",
    { mimeType: "application/json" },
    async () => {
      const content = fs.readFileSync(
        path.join(assetsDir, "registry.json"),
        "utf-8",
      );
      return {
        contents: [
          {
            uri: "ghost://registry",
            mimeType: "application/json",
            text: content,
          },
        ],
      };
    },
  );

  server.resource(
    "Ghost UI Skills",
    "ghost://skills",
    { mimeType: "text/markdown" },
    async () => {
      const content = getSkills();
      return {
        contents: [
          {
            uri: "ghost://skills",
            mimeType: "text/markdown",
            text: content,
          },
        ],
      };
    },
  );
}
