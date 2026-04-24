"use client";

import {
  Context,
  ContextContent,
  ContextContentBody,
  ContextContentFooter,
  ContextContentHeader,
  ContextInputUsage,
  ContextOutputUsage,
  ContextTrigger,
} from "ghost-ui";

export function ContextDemo() {
  return (
    <Context
      usedTokens={48000}
      maxTokens={128000}
      usage={{
        inputTokens: 32000,
        outputTokens: 16000,
        totalTokens: 48000,
        inputTokenDetails: {
          cacheReadTokens: 0,
          cacheWriteTokens: 0,
          noCacheTokens: 32000,
        },
        outputTokenDetails: { reasoningTokens: 0, textTokens: 16000 },
      }}
    >
      <ContextTrigger />
      <ContextContent>
        <ContextContentHeader />
        <ContextContentBody>
          <div className="space-y-2">
            <ContextInputUsage />
            <ContextOutputUsage />
          </div>
        </ContextContentBody>
        <ContextContentFooter />
      </ContextContent>
    </Context>
  );
}
