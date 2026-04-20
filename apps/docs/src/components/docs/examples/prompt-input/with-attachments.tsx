import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@ghost/ui";

export default function PromptInputWithAttachments() {
  return (
    <div className="w-full max-w-xl mx-auto p-4">
      <PromptInput
        accept="image/*,.pdf,.txt"
        maxFiles={5}
        maxFileSize={10 * 1024 * 1024}
        onSubmit={(msg) => {
          console.log("Submitted:", msg);
        }}
      >
        <PromptInputTextarea placeholder="Describe your task or attach files..." />
        <PromptInputFooter>
          <PromptInputTools>
            <PromptInputActionAddAttachments />
          </PromptInputTools>
          <PromptInputSubmit />
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}
