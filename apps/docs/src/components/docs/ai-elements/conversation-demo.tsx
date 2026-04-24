"use client";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
} from "ghost-ui";
import { MessageSquareIcon } from "lucide-react";

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
