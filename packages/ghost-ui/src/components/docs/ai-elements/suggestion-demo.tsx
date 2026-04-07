"use client";

import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";

export function SuggestionDemo() {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">Suggested prompts</p>
      <Suggestions>
        <Suggestion suggestion="Explain quantum computing" />
        <Suggestion suggestion="Write a Python script to sort files" />
        <Suggestion suggestion="What are the best practices for REST APIs?" />
        <Suggestion suggestion="Compare SQL and NoSQL databases" />
        <Suggestion suggestion="Help me debug my React app" />
      </Suggestions>
    </div>
  );
}
