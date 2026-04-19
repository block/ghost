"use client";

import { Shimmer } from "@ghost/ui";

export function ShimmerDemo() {
  return (
    <div className="space-y-4">
      <Shimmer as="h3" className="text-lg font-semibold">
        Generating response...
      </Shimmer>

      <Shimmer as="p" className="text-sm" duration={3}>
        Analyzing your code and preparing suggestions
      </Shimmer>

      <Shimmer as="span" className="text-xs" duration={1.5}>
        Thinking...
      </Shimmer>
    </div>
  );
}
