"use client";

// Code
import { AgentDemo } from "@/components/docs/ai-elements/agent-demo";
import { ArtifactDemo } from "@/components/docs/ai-elements/artifact-demo";
// Chatbot
import { AttachmentsDemo } from "@/components/docs/ai-elements/attachments-demo";
// Voice
import { AudioPlayerDemo } from "@/components/docs/ai-elements/audio-player-demo";
// Workflow
import { CanvasDemo } from "@/components/docs/ai-elements/canvas-demo";
import { ChainOfThoughtDemo } from "@/components/docs/ai-elements/chain-of-thought-demo";
import { CheckpointDemo } from "@/components/docs/ai-elements/checkpoint-demo";
import { CodeBlockDemo } from "@/components/docs/ai-elements/code-block-demo";
import { CommitDemo } from "@/components/docs/ai-elements/commit-demo";
import { ConfirmationDemo } from "@/components/docs/ai-elements/confirmation-demo";
import { ConnectionDemo } from "@/components/docs/ai-elements/connection-demo";
import { ContextDemo } from "@/components/docs/ai-elements/context-demo";
import { ControlsDemo } from "@/components/docs/ai-elements/controls-demo";
import { ConversationDemo } from "@/components/docs/ai-elements/conversation-demo";
import { EdgeDemo } from "@/components/docs/ai-elements/edge-demo";
import { EnvironmentVariablesDemo } from "@/components/docs/ai-elements/environment-variables-demo";
import { FileTreeDemo } from "@/components/docs/ai-elements/file-tree-demo";
// Utilities
import { ImageDemo } from "@/components/docs/ai-elements/image-demo";
import { InlineCitationDemo } from "@/components/docs/ai-elements/inline-citation-demo";
import { JsxPreviewDemo } from "@/components/docs/ai-elements/jsx-preview-demo";
import { MessageDemo } from "@/components/docs/ai-elements/message-demo";
import { MicSelectorDemo } from "@/components/docs/ai-elements/mic-selector-demo";
import { ModelSelectorDemo } from "@/components/docs/ai-elements/model-selector-demo";
import { NodeDemo } from "@/components/docs/ai-elements/node-demo";
import { OpenInChatDemo } from "@/components/docs/ai-elements/open-in-chat-demo";
import { PackageInfoDemo } from "@/components/docs/ai-elements/package-info-demo";
import { PanelDemo } from "@/components/docs/ai-elements/panel-demo";
import { PersonaDemo } from "@/components/docs/ai-elements/persona-demo";
import { PlanDemo } from "@/components/docs/ai-elements/plan-demo";
import { PromptInputDemo } from "@/components/docs/ai-elements/prompt-input-demo";
import { QueueDemo } from "@/components/docs/ai-elements/queue-demo";
import { ReasoningDemo } from "@/components/docs/ai-elements/reasoning-demo";
import { SandboxDemo } from "@/components/docs/ai-elements/sandbox-demo";
import { SchemaDisplayDemo } from "@/components/docs/ai-elements/schema-display-demo";
import { ShimmerDemo } from "@/components/docs/ai-elements/shimmer-demo";
import { SnippetDemo } from "@/components/docs/ai-elements/snippet-demo";
import { SourcesDemo } from "@/components/docs/ai-elements/sources-demo";
import { SpeechInputDemo } from "@/components/docs/ai-elements/speech-input-demo";
import { StackTraceDemo } from "@/components/docs/ai-elements/stack-trace-demo";
import { SuggestionDemo } from "@/components/docs/ai-elements/suggestion-demo";
import { TaskDemo } from "@/components/docs/ai-elements/task-demo";
import { TerminalDemo } from "@/components/docs/ai-elements/terminal-demo";
import { TestResultsDemo } from "@/components/docs/ai-elements/test-results-demo";
import { ToolDemo } from "@/components/docs/ai-elements/tool-demo";
import { ToolbarDemo } from "@/components/docs/ai-elements/toolbar-demo";
import { TranscriptionDemo } from "@/components/docs/ai-elements/transcription-demo";
import { VoiceSelectorDemo } from "@/components/docs/ai-elements/voice-selector-demo";
import { WebPreviewDemo } from "@/components/docs/ai-elements/web-preview-demo";
import { ComponentWrapper } from "@/components/docs/primitives/component-wrapper";

function CategoryLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="pt-8 pb-2">
      <p
        className="font-display uppercase text-muted-foreground"
        style={{
          fontSize: "var(--label-font-size)",
          letterSpacing: "var(--label-letter-spacing)",
          fontWeight: "var(--label-font-weight)",
        }}
      >
        {children}
      </p>
    </div>
  );
}

export function AIElementDemos() {
  return (
    <div className="@container grid flex-1 gap-4 space-y-8 md:py-12">
      {/* Chatbot */}
      <CategoryLabel>Chatbot</CategoryLabel>
      <ComponentWrapper name="attachments">
        <AttachmentsDemo />
      </ComponentWrapper>
      <ComponentWrapper name="chain-of-thought">
        <ChainOfThoughtDemo />
      </ComponentWrapper>
      <ComponentWrapper name="checkpoint">
        <CheckpointDemo />
      </ComponentWrapper>
      <ComponentWrapper name="confirmation">
        <ConfirmationDemo />
      </ComponentWrapper>
      <ComponentWrapper name="context">
        <ContextDemo />
      </ComponentWrapper>
      <ComponentWrapper name="conversation">
        <ConversationDemo />
      </ComponentWrapper>
      <ComponentWrapper name="inline-citation">
        <InlineCitationDemo />
      </ComponentWrapper>
      <ComponentWrapper name="message">
        <MessageDemo />
      </ComponentWrapper>
      <ComponentWrapper name="model-selector">
        <ModelSelectorDemo />
      </ComponentWrapper>
      <ComponentWrapper name="plan">
        <PlanDemo />
      </ComponentWrapper>
      <ComponentWrapper name="prompt-input">
        <PromptInputDemo />
      </ComponentWrapper>
      <ComponentWrapper name="queue">
        <QueueDemo />
      </ComponentWrapper>
      <ComponentWrapper name="reasoning">
        <ReasoningDemo />
      </ComponentWrapper>
      <ComponentWrapper name="shimmer">
        <ShimmerDemo />
      </ComponentWrapper>
      <ComponentWrapper name="sources">
        <SourcesDemo />
      </ComponentWrapper>
      <ComponentWrapper name="suggestion">
        <SuggestionDemo />
      </ComponentWrapper>
      <ComponentWrapper name="task">
        <TaskDemo />
      </ComponentWrapper>
      <ComponentWrapper name="tool">
        <ToolDemo />
      </ComponentWrapper>

      {/* Code */}
      <CategoryLabel>Code</CategoryLabel>
      <ComponentWrapper name="agent">
        <AgentDemo />
      </ComponentWrapper>
      <ComponentWrapper name="artifact">
        <ArtifactDemo />
      </ComponentWrapper>
      <ComponentWrapper name="code-block">
        <CodeBlockDemo />
      </ComponentWrapper>
      <ComponentWrapper name="commit">
        <CommitDemo />
      </ComponentWrapper>
      <ComponentWrapper name="environment-variables">
        <EnvironmentVariablesDemo />
      </ComponentWrapper>
      <ComponentWrapper name="file-tree">
        <FileTreeDemo />
      </ComponentWrapper>
      <ComponentWrapper name="jsx-preview">
        <JsxPreviewDemo />
      </ComponentWrapper>
      <ComponentWrapper name="package-info">
        <PackageInfoDemo />
      </ComponentWrapper>
      <ComponentWrapper name="sandbox">
        <SandboxDemo />
      </ComponentWrapper>
      <ComponentWrapper name="schema-display">
        <SchemaDisplayDemo />
      </ComponentWrapper>
      <ComponentWrapper name="snippet">
        <SnippetDemo />
      </ComponentWrapper>
      <ComponentWrapper name="stack-trace">
        <StackTraceDemo />
      </ComponentWrapper>
      <ComponentWrapper name="terminal">
        <TerminalDemo />
      </ComponentWrapper>
      <ComponentWrapper name="test-results">
        <TestResultsDemo />
      </ComponentWrapper>
      <ComponentWrapper name="web-preview">
        <WebPreviewDemo />
      </ComponentWrapper>

      {/* Voice */}
      <CategoryLabel>Voice</CategoryLabel>
      <ComponentWrapper name="audio-player">
        <AudioPlayerDemo />
      </ComponentWrapper>
      <ComponentWrapper name="mic-selector">
        <MicSelectorDemo />
      </ComponentWrapper>
      <ComponentWrapper name="persona">
        <PersonaDemo />
      </ComponentWrapper>
      <ComponentWrapper name="speech-input">
        <SpeechInputDemo />
      </ComponentWrapper>
      <ComponentWrapper name="transcription">
        <TranscriptionDemo />
      </ComponentWrapper>
      <ComponentWrapper name="voice-selector">
        <VoiceSelectorDemo />
      </ComponentWrapper>

      {/* Workflow */}
      <CategoryLabel>Workflow</CategoryLabel>
      <ComponentWrapper name="canvas">
        <CanvasDemo />
      </ComponentWrapper>
      <ComponentWrapper name="connection">
        <ConnectionDemo />
      </ComponentWrapper>
      <ComponentWrapper name="controls">
        <ControlsDemo />
      </ComponentWrapper>
      <ComponentWrapper name="edge">
        <EdgeDemo />
      </ComponentWrapper>
      <ComponentWrapper name="node">
        <NodeDemo />
      </ComponentWrapper>
      <ComponentWrapper name="panel">
        <PanelDemo />
      </ComponentWrapper>
      <ComponentWrapper name="toolbar">
        <ToolbarDemo />
      </ComponentWrapper>

      {/* Utilities */}
      <CategoryLabel>Utilities</CategoryLabel>
      <ComponentWrapper name="image">
        <ImageDemo />
      </ComponentWrapper>
      <ComponentWrapper name="open-in-chat">
        <OpenInChatDemo />
      </ComponentWrapper>
    </div>
  );
}
