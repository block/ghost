"use client";

import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockCopyButton,
  CodeBlockFilename,
  CodeBlockHeader,
  CodeBlockTitle,
} from "@ghost/ui";

const typescriptCode = `interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user" | "guest";
}

async function getUser(id: string): Promise<User> {
  const response = await fetch(\`/api/users/\${id}\`);

  if (!response.ok) {
    throw new Error(\`Failed to fetch user: \${response.statusText}\`);
  }

  return response.json();
}`;

const cssCode = `.container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  padding: 2rem;
}

.card {
  border-radius: 0.75rem;
  background: var(--card-bg);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}`;

const jsonCode = `{
  "name": "@acme/design-system",
  "version": "2.4.0",
  "dependencies": {
    "react": "^19.0.0",
    "tailwindcss": "^4.0.0"
  }
}`;

export function CodeBlockDemo() {
  return (
    <div className="grid max-w-2xl gap-6">
      <CodeBlock code={typescriptCode} language="typescript" showLineNumbers>
        <CodeBlockHeader>
          <CodeBlockTitle>
            <CodeBlockFilename>lib/api/users.ts</CodeBlockFilename>
          </CodeBlockTitle>
          <CodeBlockActions>
            <CodeBlockCopyButton />
          </CodeBlockActions>
        </CodeBlockHeader>
      </CodeBlock>

      <CodeBlock code={cssCode} language="css">
        <CodeBlockHeader>
          <CodeBlockTitle>
            <CodeBlockFilename>styles/layout.css</CodeBlockFilename>
          </CodeBlockTitle>
          <CodeBlockActions>
            <CodeBlockCopyButton />
          </CodeBlockActions>
        </CodeBlockHeader>
      </CodeBlock>

      <CodeBlock code={jsonCode} language="json" />
    </div>
  );
}
