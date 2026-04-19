"use client";

import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@ghost/ui";

export function ToolDemo() {
  return (
    <div className="space-y-4">
      <Tool defaultOpen>
        <ToolHeader
          type="tool-invocation"
          state="output-available"
          title="search_files"
        />
        <ToolContent>
          <ToolInput
            input={{
              query: "authentication middleware",
              directory: "src/",
              filePattern: "*.ts",
            }}
          />
          <ToolOutput
            output={{
              matches: [
                "src/middleware/auth.ts",
                "src/lib/verify-token.ts",
                "src/routes/login.ts",
              ],
              totalMatches: 3,
            }}
            errorText={undefined}
          />
        </ToolContent>
      </Tool>

      <Tool>
        <ToolHeader
          type="tool-invocation"
          state="input-available"
          title="execute_command"
        />
        <ToolContent>
          <ToolInput input={{ command: "npm run build" }} />
        </ToolContent>
      </Tool>

      <Tool>
        <ToolHeader
          type="tool-invocation"
          state="output-error"
          title="read_file"
        />
        <ToolContent>
          <ToolInput input={{ path: "/etc/shadow" }} />
          <ToolOutput
            output={undefined}
            errorText="Permission denied: cannot read /etc/shadow"
          />
        </ToolContent>
      </Tool>
    </div>
  );
}
