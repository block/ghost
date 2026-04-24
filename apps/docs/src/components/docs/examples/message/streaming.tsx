import { Message, MessageContent, MessageResponse, Shimmer } from "ghost-ui";

export default function MessageStreaming() {
  return (
    <div className="flex flex-col gap-6 p-4">
      <Message from="user">
        <MessageContent>
          <p>Explain quantum entanglement in simple terms.</p>
        </MessageContent>
      </Message>

      <Message from="assistant">
        <MessageContent>
          <MessageResponse isAnimating>
            {`Quantum entanglement is when two particles become linked so that measuring one instantly affects the other, no matter how far apart they are. Einstein called it "spooky action at a distance."`}
          </MessageResponse>
          <Shimmer className="text-sm text-muted-foreground" duration={1.5}>
            Generating...
          </Shimmer>
        </MessageContent>
      </Message>
    </div>
  );
}
