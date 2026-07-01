import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerResources } from "./resources.js";
import { registerTools } from "./tools.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "vessel",
    version: "0.1.0",
  });

  registerTools(server);
  registerResources(server);

  return server;
}
