"use client";

import { MessageSquareIcon } from "lucide-react";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
} from "@/components/ai-elements/conversation";

export function ConversationDemo() {
  return (
    <div className="h-[300px] rounded-lg border">
      <Conversation>
        <ConversationContent>
          <ConversationEmptyState
            title="Start a conversation"
            description="Ask me anything to get started."
            icon={<MessageSquareIcon className="size-8" />}
          />
        </ConversationContent>
      </Conversation>
    </div>
  );
}
