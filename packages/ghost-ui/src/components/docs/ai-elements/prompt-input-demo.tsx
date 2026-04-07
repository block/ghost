"use client";

import { PaperclipIcon } from "lucide-react";
import {
  PromptInput,
  PromptInputButton,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";

export function PromptInputDemo() {
  return (
    <div className="w-full max-w-2xl">
      <PromptInput onSubmit={() => {}}>
        <PromptInputTextarea placeholder="Ask anything..." />
        <PromptInputFooter>
          <PromptInputTools>
            <PromptInputButton tooltip="Attach file">
              <PaperclipIcon className="size-4" />
            </PromptInputButton>
          </PromptInputTools>
          <PromptInputSubmit />
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}
