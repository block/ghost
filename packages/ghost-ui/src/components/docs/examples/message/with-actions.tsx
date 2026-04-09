import { CopyIcon, RefreshCwIcon, ThumbsDownIcon, ThumbsUpIcon } from "lucide-react";
import {
  Message,
  MessageActions,
  MessageAction,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";

export default function MessageWithActions() {
  return (
    <div className="flex flex-col gap-6 p-4">
      <Message from="user">
        <MessageContent>
          <p>How do I center a div?</p>
        </MessageContent>
      </Message>

      <Message from="assistant">
        <MessageContent>
          <MessageResponse>
            {`You can center a div using **flexbox**:\n\n\`\`\`css\n.parent {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n}\n\`\`\`\n\nOr use **grid**:\n\n\`\`\`css\n.parent {\n  display: grid;\n  place-items: center;\n}\n\`\`\``}
          </MessageResponse>
        </MessageContent>
        <MessageActions>
          <MessageAction tooltip="Copy">
            <CopyIcon className="size-3.5" />
          </MessageAction>
          <MessageAction tooltip="Regenerate">
            <RefreshCwIcon className="size-3.5" />
          </MessageAction>
          <MessageAction tooltip="Good response">
            <ThumbsUpIcon className="size-3.5" />
          </MessageAction>
          <MessageAction tooltip="Bad response">
            <ThumbsDownIcon className="size-3.5" />
          </MessageAction>
        </MessageActions>
      </Message>
    </div>
  );
}
