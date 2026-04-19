"use client";

import {
  Snippet,
  SnippetAddon,
  SnippetCopyButton,
  SnippetInput,
  SnippetText,
} from "@ghost/ui";

export function SnippetDemo() {
  return (
    <div className="grid max-w-lg gap-6">
      <Snippet code="npm install @acme/design-system">
        <SnippetAddon>
          <SnippetText>$</SnippetText>
        </SnippetAddon>
        <SnippetInput />
        <SnippetAddon>
          <SnippetCopyButton />
        </SnippetAddon>
      </Snippet>

      <Snippet code="npx create-next-app@latest my-app --typescript">
        <SnippetAddon>
          <SnippetText>$</SnippetText>
        </SnippetAddon>
        <SnippetInput />
        <SnippetAddon>
          <SnippetCopyButton />
        </SnippetAddon>
      </Snippet>

      <Snippet code="curl -X POST https://api.example.com/v1/data -H 'Authorization: Bearer token'">
        <SnippetInput />
        <SnippetAddon>
          <SnippetCopyButton />
        </SnippetAddon>
      </Snippet>

      <Snippet code="ssh user@192.168.1.100 -p 2222">
        <SnippetAddon>
          <SnippetText>$</SnippetText>
        </SnippetAddon>
        <SnippetInput />
        <SnippetAddon>
          <SnippetCopyButton />
        </SnippetAddon>
      </Snippet>
    </div>
  );
}
