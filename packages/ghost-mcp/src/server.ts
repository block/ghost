import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools } from "./tools.js";
import { registerResources } from "./resources.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "ghost-ui",
    version: "0.1.0",
  });

  registerTools(server);
  registerResources(server);

  return server;
}
