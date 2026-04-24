"use client";

import {
  Button,
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorLogoGroup,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "ghost-ui";

export function ModelSelectorDemo() {
  return (
    <ModelSelector>
      <ModelSelectorTrigger asChild>
        <Button variant="outline">Select a model</Button>
      </ModelSelectorTrigger>
      <ModelSelectorContent title="Choose a Model">
        <ModelSelectorInput placeholder="Search models..." />
        <ModelSelectorList>
          <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
          <ModelSelectorGroup heading="OpenAI">
            <ModelSelectorItem value="gpt-4o">
              <ModelSelectorLogoGroup>
                <ModelSelectorLogo provider="openai" />
              </ModelSelectorLogoGroup>
              <ModelSelectorName>GPT-4o</ModelSelectorName>
            </ModelSelectorItem>
            <ModelSelectorItem value="gpt-4o-mini">
              <ModelSelectorLogoGroup>
                <ModelSelectorLogo provider="openai" />
              </ModelSelectorLogoGroup>
              <ModelSelectorName>GPT-4o Mini</ModelSelectorName>
            </ModelSelectorItem>
          </ModelSelectorGroup>
          <ModelSelectorGroup heading="Anthropic">
            <ModelSelectorItem value="claude-sonnet-4-20250514">
              <ModelSelectorLogoGroup>
                <ModelSelectorLogo provider="anthropic" />
              </ModelSelectorLogoGroup>
              <ModelSelectorName>Claude Sonnet 4</ModelSelectorName>
            </ModelSelectorItem>
            <ModelSelectorItem value="claude-opus-4-20250514">
              <ModelSelectorLogoGroup>
                <ModelSelectorLogo provider="anthropic" />
              </ModelSelectorLogoGroup>
              <ModelSelectorName>Claude Opus 4</ModelSelectorName>
            </ModelSelectorItem>
          </ModelSelectorGroup>
          <ModelSelectorGroup heading="Google">
            <ModelSelectorItem value="gemini-2.5-pro">
              <ModelSelectorLogoGroup>
                <ModelSelectorLogo provider="google" />
              </ModelSelectorLogoGroup>
              <ModelSelectorName>Gemini 2.5 Pro</ModelSelectorName>
            </ModelSelectorItem>
          </ModelSelectorGroup>
        </ModelSelectorList>
      </ModelSelectorContent>
    </ModelSelector>
  );
}
