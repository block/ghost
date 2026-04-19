"use client";

import {
  OpenIn,
  OpenInChatGPT,
  OpenInClaude,
  OpenInContent,
  OpenInCursor,
  OpenInLabel,
  OpenInScira,
  OpenInSeparator,
  OpenInT3,
  OpenInTrigger,
  OpenInv0,
} from "@ghost/ui";

export function OpenInChatDemo() {
  return (
    <div className="flex w-full flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        A dropdown menu that lets users open a query in various AI chat
        providers. Each item generates a provider-specific URL and opens it in a
        new tab.
      </p>

      <OpenIn query="Explain how React Server Components work and when to use them">
        <OpenInTrigger />
        <OpenInContent>
          <OpenInLabel>Open in a chat provider</OpenInLabel>
          <OpenInSeparator />
          <OpenInClaude />
          <OpenInChatGPT />
          <OpenInT3 />
          <OpenInScira />
          <OpenInv0 />
          <OpenInSeparator />
          <OpenInCursor />
        </OpenInContent>
      </OpenIn>
    </div>
  );
}
