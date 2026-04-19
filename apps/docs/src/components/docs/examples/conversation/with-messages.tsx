import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
  Message,
  MessageContent,
  MessageResponse,
} from "@ghost/ui";

const messages = [
  { id: "1", role: "user" as const, text: "What is TypeScript?" },
  {
    id: "2",
    role: "assistant" as const,
    text: "TypeScript is a strongly-typed superset of JavaScript developed by Microsoft. It adds optional static type checking, interfaces, enums, and other features that help catch errors at compile time rather than at runtime.",
  },
  { id: "3", role: "user" as const, text: "How does it compare to Flow?" },
  {
    id: "4",
    role: "assistant" as const,
    text: "Both TypeScript and Flow add static types to JavaScript, but they differ in key ways:\n\n- **Adoption**: TypeScript has much wider community adoption and tooling support.\n- **Type system**: TypeScript uses a structural type system; Flow also uses structural typing but with some nominal typing features.\n- **Tooling**: TypeScript ships its own compiler (`tsc`), while Flow relies on Babel for compilation.\n- **Ecosystem**: TypeScript has DefinitelyTyped with type definitions for thousands of packages.",
  },
];

export default function ConversationWithMessages() {
  return (
    <div className="h-[400px] rounded-lg border">
      <Conversation>
        <ConversationContent>
          {messages.map((msg) => (
            <Message key={msg.id} from={msg.role}>
              <MessageContent>
                {msg.role === "assistant" ? (
                  <MessageResponse>{msg.text}</MessageResponse>
                ) : (
                  <p>{msg.text}</p>
                )}
              </MessageContent>
            </Message>
          ))}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
    </div>
  );
}
