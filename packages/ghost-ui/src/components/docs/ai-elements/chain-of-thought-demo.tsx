"use client";

import { DatabaseIcon, FileTextIcon, SearchIcon } from "lucide-react";
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtSearchResult,
  ChainOfThoughtSearchResults,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";

export function ChainOfThoughtDemo() {
  return (
    <ChainOfThought defaultOpen>
      <ChainOfThoughtHeader>Researching climate data</ChainOfThoughtHeader>
      <ChainOfThoughtContent>
        <ChainOfThoughtStep
          icon={SearchIcon}
          label="Searching for recent climate reports"
          status="complete"
        >
          <ChainOfThoughtSearchResults>
            <ChainOfThoughtSearchResult>IPCC 2024</ChainOfThoughtSearchResult>
            <ChainOfThoughtSearchResult>
              NASA Climate
            </ChainOfThoughtSearchResult>
            <ChainOfThoughtSearchResult>NOAA Data</ChainOfThoughtSearchResult>
          </ChainOfThoughtSearchResults>
        </ChainOfThoughtStep>

        <ChainOfThoughtStep
          icon={DatabaseIcon}
          label="Analyzing temperature datasets"
          description="Cross-referencing satellite data with ground station measurements"
          status="complete"
        />

        <ChainOfThoughtStep
          icon={FileTextIcon}
          label="Generating summary"
          status="active"
        />

        <ChainOfThoughtStep
          label="Formatting final response"
          status="pending"
        />
      </ChainOfThoughtContent>
    </ChainOfThought>
  );
}
