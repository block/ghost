"use client";

import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";

export function ReasoningDemo() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-muted-foreground text-sm">Completed reasoning</p>
        <Reasoning defaultOpen duration={12}>
          <ReasoningTrigger />
          <ReasoningContent>
            {`The user is asking about the performance implications of using React Server Components. Let me think through the key factors:\n\n1. **Bundle size reduction** - Since server components don't ship JavaScript to the client, the initial bundle can be significantly smaller.\n\n2. **Data fetching** - Server components can fetch data directly during rendering, eliminating client-side waterfalls.\n\n3. **Streaming** - The server can stream HTML progressively, improving Time to First Byte.`}
          </ReasoningContent>
        </Reasoning>
      </div>

      <div className="space-y-2">
        <p className="text-muted-foreground text-sm">Streaming reasoning</p>
        <Reasoning defaultOpen isStreaming>
          <ReasoningTrigger />
          <ReasoningContent>
            {`Analyzing the query about database optimization strategies. I should consider indexing, query planning, and caching...`}
          </ReasoningContent>
        </Reasoning>
      </div>
    </div>
  );
}
