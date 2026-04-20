"use client";

import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockCopyButton,
  CodeBlockFilename,
  CodeBlockHeader,
  CodeBlockTitle,
  Sandbox,
  SandboxContent,
  SandboxHeader,
  SandboxTabContent,
  SandboxTabs,
  SandboxTabsBar,
  SandboxTabsList,
  SandboxTabsTrigger,
} from "@ghost/ui";

const codeSnippet = `import { useState } from "react";

export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div className="flex flex-col items-center gap-4 p-8">
      <h1 className="text-2xl font-bold">{count}</h1>
      <button onClick={() => setCount(c => c + 1)}>
        Increment
      </button>
    </div>
  );
}`;

const outputText = `> next dev --turbo
  Ready in 1.2s
  Local: http://localhost:3000
  Network: http://192.168.1.100:3000

  Compiled /page in 340ms`;

export function SandboxDemo() {
  return (
    <div className="grid max-w-2xl gap-6">
      <Sandbox>
        <SandboxHeader title="Code Sandbox" state="output-available" />
        <SandboxContent>
          <SandboxTabs defaultValue="code">
            <SandboxTabsBar>
              <SandboxTabsList>
                <SandboxTabsTrigger value="code">Code</SandboxTabsTrigger>
                <SandboxTabsTrigger value="output">Output</SandboxTabsTrigger>
              </SandboxTabsList>
            </SandboxTabsBar>
            <SandboxTabContent value="code">
              <CodeBlock code={codeSnippet} language="tsx">
                <CodeBlockHeader>
                  <CodeBlockTitle>
                    <CodeBlockFilename>counter.tsx</CodeBlockFilename>
                  </CodeBlockTitle>
                  <CodeBlockActions>
                    <CodeBlockCopyButton />
                  </CodeBlockActions>
                </CodeBlockHeader>
              </CodeBlock>
            </SandboxTabContent>
            <SandboxTabContent value="output">
              <pre className="p-4 font-mono text-sm">{outputText}</pre>
            </SandboxTabContent>
          </SandboxTabs>
        </SandboxContent>
      </Sandbox>

      <Sandbox>
        <SandboxHeader title="Running Tests" state="input-streaming" />
        <SandboxContent>
          <div className="p-4 text-muted-foreground text-sm">
            Executing test suite...
          </div>
        </SandboxContent>
      </Sandbox>
    </div>
  );
}
