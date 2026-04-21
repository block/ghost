"use client";

import {
  Agent,
  AgentContent,
  AgentHeader,
  AgentInstructions,
  AgentOutput,
  AgentTool,
  AgentTools,
} from "ghost-ui";

export function AgentDemo() {
  return (
    <div className="grid max-w-2xl gap-6">
      <Agent>
        <AgentHeader name="Research Assistant" model="gpt-4o" />
        <AgentContent>
          <AgentInstructions>
            You are a research assistant that helps users find and summarize
            academic papers. Use the provided tools to search databases and
            retrieve relevant publications. Always cite your sources.
          </AgentInstructions>
          <AgentTools type="multiple" defaultValue={["search"]}>
            <AgentTool
              value="search"
              tool={
                {
                  description: "Search academic databases for papers",
                  inputSchema: {
                    type: "object",
                    properties: {
                      query: { type: "string", description: "Search query" },
                      limit: {
                        type: "number",
                        description: "Maximum results to return",
                      },
                    },
                    required: ["query"],
                  },
                } as any
              }
            />
            <AgentTool
              value="summarize"
              tool={
                {
                  description: "Summarize a paper given its content",
                  inputSchema: {
                    type: "object",
                    properties: {
                      content: {
                        type: "string",
                        description: "The paper content to summarize",
                      },
                      maxLength: {
                        type: "number",
                        description: "Maximum summary length in words",
                      },
                    },
                    required: ["content"],
                  },
                } as any
              }
            />
          </AgentTools>
          <AgentOutput
            schema={`interface ResearchResult {
  title: string;
  authors: string[];
  summary: string;
  relevanceScore: number;
}`}
          />
        </AgentContent>
      </Agent>

      <Agent>
        <AgentHeader name="Code Reviewer" model="claude-3.5-sonnet" />
        <AgentContent>
          <AgentInstructions>
            Review code for best practices, potential bugs, and performance
            issues. Provide actionable feedback with specific line references.
          </AgentInstructions>
        </AgentContent>
      </Agent>
    </div>
  );
}
