"use client";

import {
  CopyIcon,
  RefreshCwIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
} from "lucide-react";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";

export function MessageDemo() {
  return (
    <div className="space-y-6">
      <Message from="user">
        <MessageContent>
          Can you explain how React Server Components work?
        </MessageContent>
      </Message>

      <Message from="assistant">
        <MessageContent>
          <MessageResponse>
            {`**React Server Components** (RSC) allow you to render components on the server, reducing the amount of JavaScript sent to the client.\n\n### Key Benefits\n\n- **Zero bundle size** — Server Components are not included in the client bundle\n- **Direct backend access** — You can query databases directly\n- **Automatic code splitting** — Client components are lazy-loaded\n\n\`\`\`tsx\n// This runs on the server\nasync function UserProfile({ id }: { id: string }) {\n  const user = await db.user.findUnique({ where: { id } });\n  return <div>{user.name}</div>;\n}\n\`\`\``}
          </MessageResponse>
        </MessageContent>
        <MessageActions>
          <MessageAction tooltip="Copy">
            <CopyIcon className="size-4" />
          </MessageAction>
          <MessageAction tooltip="Thumbs up">
            <ThumbsUpIcon className="size-4" />
          </MessageAction>
          <MessageAction tooltip="Thumbs down">
            <ThumbsDownIcon className="size-4" />
          </MessageAction>
          <MessageAction tooltip="Regenerate">
            <RefreshCwIcon className="size-4" />
          </MessageAction>
        </MessageActions>
      </Message>
    </div>
  );
}
