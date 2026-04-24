"use client";

import { Skeleton } from "ghost-ui";
import { lazy, Suspense, useMemo } from "react";

const exampleModules = import.meta.glob<{ default: React.ComponentType }>(
  "/src/components/docs/examples/**/*.tsx",
);

const LoadingSkeleton = () => (
  <div className="flex w-full flex-col gap-4 py-8">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-48 w-full" />
  </div>
);

export function ExampleLoader({
  componentSlug,
  exampleName,
}: {
  componentSlug: string;
  exampleName: string;
}) {
  const path = `/src/components/docs/examples/${componentSlug}/${exampleName}.tsx`;
  const loader = exampleModules[path];

  const LazyComponent = useMemo(() => {
    if (!loader) return null;
    return lazy(loader);
  }, [loader]);

  if (!LazyComponent) return null;

  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <LazyComponent />
    </Suspense>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const wrap = (imp: Promise<any>, name: string) =>
  imp.then((m: any) => ({ default: m[name] }));

const demos: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
  // ── Inputs ──
  button: lazy(() =>
    wrap(import("@/components/docs/primitives/button-demo"), "ButtonDemo"),
  ),
  input: lazy(() =>
    wrap(import("@/components/docs/primitives/input-demo"), "InputDemo"),
  ),
  textarea: lazy(() =>
    wrap(import("@/components/docs/primitives/textarea-demo"), "TextareaDemo"),
  ),
  select: lazy(() =>
    wrap(import("@/components/docs/primitives/select-demo"), "SelectDemo"),
  ),
  checkbox: lazy(() =>
    wrap(import("@/components/docs/primitives/checkbox-demo"), "CheckboxDemo"),
  ),
  "radio-group": lazy(() =>
    wrap(
      import("@/components/docs/primitives/radio-group-demo"),
      "RadioGroupDemo",
    ),
  ),
  slider: lazy(() =>
    wrap(import("@/components/docs/primitives/slider-demo"), "SliderDemo"),
  ),
  switch: lazy(() =>
    wrap(import("@/components/docs/primitives/switch-demo"), "SwitchDemo"),
  ),
  toggle: lazy(() =>
    wrap(import("@/components/docs/primitives/toggle-demo"), "ToggleDemo"),
  ),
  "toggle-group": lazy(() =>
    wrap(
      import("@/components/docs/primitives/toggle-group-demo"),
      "ToggleGroupDemo",
    ),
  ),
  combobox: lazy(() =>
    wrap(import("@/components/docs/primitives/combobox-demo"), "ComboboxDemo"),
  ),
  command: lazy(() =>
    wrap(import("@/components/docs/primitives/command-demo"), "CommandDemo"),
  ),
  "date-picker": lazy(() =>
    wrap(
      import("@/components/docs/primitives/date-picker-demo"),
      "DatePickerDemo",
    ),
  ),
  "input-otp": lazy(() =>
    wrap(import("@/components/docs/primitives/input-otp-demo"), "InputOTPDemo"),
  ),
  form: lazy(() =>
    wrap(import("@/components/docs/primitives/form-demo"), "FormDemo"),
  ),
  forms: lazy(() =>
    wrap(import("@/components/docs/primitives/forms-demo"), "FormsDemo"),
  ),
  label: lazy(() =>
    wrap(import("@/components/docs/primitives/label-demo"), "LabelDemo"),
  ),

  // ── Display ──
  card: lazy(() =>
    wrap(import("@/components/docs/primitives/card-demo"), "CardDemo"),
  ),
  badge: lazy(() =>
    wrap(import("@/components/docs/primitives/badge-demo"), "BadgeDemo"),
  ),
  avatar: lazy(() =>
    wrap(import("@/components/docs/primitives/avatar-demo"), "AvatarDemo"),
  ),
  carousel: lazy(() =>
    wrap(import("@/components/docs/primitives/carousel-demo"), "CarouselDemo"),
  ),
  "aspect-ratio": lazy(() =>
    wrap(
      import("@/components/docs/primitives/aspect-ratio-demo"),
      "AspectRatioDemo",
    ),
  ),
  "hover-card": lazy(() =>
    wrap(
      import("@/components/docs/primitives/hover-card-demo"),
      "HoverCardDemo",
    ),
  ),
  skeleton: lazy(() =>
    wrap(import("@/components/docs/primitives/skeleton-demo"), "SkeletonDemo"),
  ),
  separator: lazy(() =>
    wrap(
      import("@/components/docs/primitives/separator-demo"),
      "SeparatorDemo",
    ),
  ),
  image: lazy(() =>
    wrap(import("@/components/docs/ai-elements/image-demo"), "ImageDemo"),
  ),

  // ── Feedback ──
  alert: lazy(() =>
    wrap(import("@/components/docs/primitives/alert-demo"), "AlertDemo"),
  ),
  "alert-dialog": lazy(() =>
    wrap(
      import("@/components/docs/primitives/alert-dialog-demo"),
      "AlertDialogDemo",
    ),
  ),
  progress: lazy(() =>
    wrap(import("@/components/docs/primitives/progress-demo"), "ProgressDemo"),
  ),
  sonner: lazy(() =>
    wrap(import("@/components/docs/primitives/sonner-demo"), "SonnerDemo"),
  ),

  // ── Data ──
  table: lazy(() =>
    wrap(import("@/components/docs/primitives/table-demo"), "TableDemo"),
  ),
  chart: lazy(() =>
    wrap(import("@/components/docs/primitives/chart-demo"), "ChartDemo"),
  ),
  "chart-area": lazy(() =>
    wrap(
      import("@/components/docs/primitives/chart-area-demo"),
      "ChartAreaDemo",
    ),
  ),
  "chart-banded": lazy(() =>
    wrap(
      import("@/components/docs/primitives/chart-banded-demo"),
      "ChartBandedDemo",
    ),
  ),
  "chart-bar": lazy(() =>
    wrap(import("@/components/docs/primitives/chart-bar-demo"), "ChartBarDemo"),
  ),
  "chart-line": lazy(() =>
    wrap(
      import("@/components/docs/primitives/chart-line-demo"),
      "ChartLineDemo",
    ),
  ),
  "chart-pie": lazy(() =>
    wrap(import("@/components/docs/primitives/chart-pie-demo"), "ChartPieDemo"),
  ),
  "chart-posneg-bar": lazy(() =>
    wrap(
      import("@/components/docs/primitives/chart-posneg-bar-demo"),
      "ChartPosNegBarDemo",
    ),
  ),
  calendar: lazy(() =>
    wrap(import("@/components/docs/primitives/calendar-demo"), "CalendarDemo"),
  ),

  // ── Overlay ──
  dialog: lazy(() =>
    wrap(import("@/components/docs/primitives/dialog-demo"), "DialogDemo"),
  ),
  drawer: lazy(() =>
    wrap(import("@/components/docs/primitives/drawer-demo"), "DrawerDemo"),
  ),
  sheet: lazy(() =>
    wrap(import("@/components/docs/primitives/sheet-demo"), "SheetDemo"),
  ),
  popover: lazy(() =>
    wrap(import("@/components/docs/primitives/popover-demo"), "PopoverDemo"),
  ),
  tooltip: lazy(() =>
    wrap(import("@/components/docs/primitives/tooltip-demo"), "TooltipDemo"),
  ),
  "context-menu": lazy(() =>
    wrap(
      import("@/components/docs/primitives/context-menu-demo"),
      "ContextMenuDemo",
    ),
  ),
  "dropdown-menu": lazy(() =>
    wrap(
      import("@/components/docs/primitives/dropdown-menu-demo"),
      "DropdownMenuDemo",
    ),
  ),
  menubar: lazy(() =>
    wrap(import("@/components/docs/primitives/menubar-demo"), "MenubarDemo"),
  ),

  // ── Navigation ──
  breadcrumb: lazy(() =>
    wrap(
      import("@/components/docs/primitives/breadcrumb-demo"),
      "BreadcrumbDemo",
    ),
  ),
  tabs: lazy(() =>
    wrap(import("@/components/docs/primitives/tabs-demo"), "TabsDemo"),
  ),
  "navigation-menu": lazy(() =>
    wrap(
      import("@/components/docs/primitives/navigation-menu-demo"),
      "NavigationMenuDemo",
    ),
  ),
  pagination: lazy(() =>
    wrap(
      import("@/components/docs/primitives/pagination-demo"),
      "PaginationDemo",
    ),
  ),
  "scroll-area": lazy(() =>
    wrap(
      import("@/components/docs/primitives/scroll-area-demo"),
      "ScrollAreaDemo",
    ),
  ),

  // ── Layout ──
  accordion: lazy(() =>
    wrap(
      import("@/components/docs/primitives/accordion-demo"),
      "AccordionDemo",
    ),
  ),
  collapsible: lazy(() =>
    wrap(
      import("@/components/docs/primitives/collapsible-demo"),
      "CollapsibleDemo",
    ),
  ),
  resizable: lazy(() =>
    wrap(
      import("@/components/docs/primitives/resizable-demo"),
      "ResizableDemo",
    ),
  ),

  // ── Chat ──
  attachments: lazy(() =>
    wrap(
      import("@/components/docs/ai-elements/attachments-demo"),
      "AttachmentsDemo",
    ),
  ),
  "chain-of-thought": lazy(() =>
    wrap(
      import("@/components/docs/ai-elements/chain-of-thought-demo"),
      "ChainOfThoughtDemo",
    ),
  ),
  checkpoint: lazy(() =>
    wrap(
      import("@/components/docs/ai-elements/checkpoint-demo"),
      "CheckpointDemo",
    ),
  ),
  confirmation: lazy(() =>
    wrap(
      import("@/components/docs/ai-elements/confirmation-demo"),
      "ConfirmationDemo",
    ),
  ),
  context: lazy(() =>
    wrap(import("@/components/docs/ai-elements/context-demo"), "ContextDemo"),
  ),
  conversation: lazy(() =>
    wrap(
      import("@/components/docs/ai-elements/conversation-demo"),
      "ConversationDemo",
    ),
  ),
  "inline-citation": lazy(() =>
    wrap(
      import("@/components/docs/ai-elements/inline-citation-demo"),
      "InlineCitationDemo",
    ),
  ),
  message: lazy(() =>
    wrap(import("@/components/docs/ai-elements/message-demo"), "MessageDemo"),
  ),
  "model-selector": lazy(() =>
    wrap(
      import("@/components/docs/ai-elements/model-selector-demo"),
      "ModelSelectorDemo",
    ),
  ),
  "open-in-chat": lazy(() =>
    wrap(
      import("@/components/docs/ai-elements/open-in-chat-demo"),
      "OpenInChatDemo",
    ),
  ),
  plan: lazy(() =>
    wrap(import("@/components/docs/ai-elements/plan-demo"), "PlanDemo"),
  ),
  "prompt-input": lazy(() =>
    wrap(
      import("@/components/docs/ai-elements/prompt-input-demo"),
      "PromptInputDemo",
    ),
  ),
  queue: lazy(() =>
    wrap(import("@/components/docs/ai-elements/queue-demo"), "QueueDemo"),
  ),
  reasoning: lazy(() =>
    wrap(
      import("@/components/docs/ai-elements/reasoning-demo"),
      "ReasoningDemo",
    ),
  ),
  shimmer: lazy(() =>
    wrap(import("@/components/docs/ai-elements/shimmer-demo"), "ShimmerDemo"),
  ),
  sources: lazy(() =>
    wrap(import("@/components/docs/ai-elements/sources-demo"), "SourcesDemo"),
  ),
  suggestion: lazy(() =>
    wrap(
      import("@/components/docs/ai-elements/suggestion-demo"),
      "SuggestionDemo",
    ),
  ),
  task: lazy(() =>
    wrap(import("@/components/docs/ai-elements/task-demo"), "TaskDemo"),
  ),
  tool: lazy(() =>
    wrap(import("@/components/docs/ai-elements/tool-demo"), "ToolDemo"),
  ),

  // ── Code ──
  agent: lazy(() =>
    wrap(import("@/components/docs/ai-elements/agent-demo"), "AgentDemo"),
  ),
  artifact: lazy(() =>
    wrap(import("@/components/docs/ai-elements/artifact-demo"), "ArtifactDemo"),
  ),
  "code-block": lazy(() =>
    wrap(
      import("@/components/docs/ai-elements/code-block-demo"),
      "CodeBlockDemo",
    ),
  ),
  commit: lazy(() =>
    wrap(import("@/components/docs/ai-elements/commit-demo"), "CommitDemo"),
  ),
  "environment-variables": lazy(() =>
    wrap(
      import("@/components/docs/ai-elements/environment-variables-demo"),
      "EnvironmentVariablesDemo",
    ),
  ),
  "file-tree": lazy(() =>
    wrap(
      import("@/components/docs/ai-elements/file-tree-demo"),
      "FileTreeDemo",
    ),
  ),
  "jsx-preview": lazy(() =>
    wrap(
      import("@/components/docs/ai-elements/jsx-preview-demo"),
      "JsxPreviewDemo",
    ),
  ),
  "package-info": lazy(() =>
    wrap(
      import("@/components/docs/ai-elements/package-info-demo"),
      "PackageInfoDemo",
    ),
  ),
  sandbox: lazy(() =>
    wrap(import("@/components/docs/ai-elements/sandbox-demo"), "SandboxDemo"),
  ),
  "schema-display": lazy(() =>
    wrap(
      import("@/components/docs/ai-elements/schema-display-demo"),
      "SchemaDisplayDemo",
    ),
  ),
  snippet: lazy(() =>
    wrap(import("@/components/docs/ai-elements/snippet-demo"), "SnippetDemo"),
  ),
  "stack-trace": lazy(() =>
    wrap(
      import("@/components/docs/ai-elements/stack-trace-demo"),
      "StackTraceDemo",
    ),
  ),
  terminal: lazy(() =>
    wrap(import("@/components/docs/ai-elements/terminal-demo"), "TerminalDemo"),
  ),
  "test-results": lazy(() =>
    wrap(
      import("@/components/docs/ai-elements/test-results-demo"),
      "TestResultsDemo",
    ),
  ),
  "web-preview": lazy(() =>
    wrap(
      import("@/components/docs/ai-elements/web-preview-demo"),
      "WebPreviewDemo",
    ),
  ),

  // ── Voice ──
  "audio-player": lazy(() =>
    wrap(
      import("@/components/docs/ai-elements/audio-player-demo"),
      "AudioPlayerDemo",
    ),
  ),
  "mic-selector": lazy(() =>
    wrap(
      import("@/components/docs/ai-elements/mic-selector-demo"),
      "MicSelectorDemo",
    ),
  ),
  persona: lazy(() =>
    wrap(import("@/components/docs/ai-elements/persona-demo"), "PersonaDemo"),
  ),
  "speech-input": lazy(() =>
    wrap(
      import("@/components/docs/ai-elements/speech-input-demo"),
      "SpeechInputDemo",
    ),
  ),
  transcription: lazy(() =>
    wrap(
      import("@/components/docs/ai-elements/transcription-demo"),
      "TranscriptionDemo",
    ),
  ),
  "voice-selector": lazy(() =>
    wrap(
      import("@/components/docs/ai-elements/voice-selector-demo"),
      "VoiceSelectorDemo",
    ),
  ),

  // ── Workflow ──
  canvas: lazy(() =>
    wrap(import("@/components/docs/ai-elements/canvas-demo"), "CanvasDemo"),
  ),
  connection: lazy(() =>
    wrap(
      import("@/components/docs/ai-elements/connection-demo"),
      "ConnectionDemo",
    ),
  ),
  controls: lazy(() =>
    wrap(import("@/components/docs/ai-elements/controls-demo"), "ControlsDemo"),
  ),
  edge: lazy(() =>
    wrap(import("@/components/docs/ai-elements/edge-demo"), "EdgeDemo"),
  ),
  node: lazy(() =>
    wrap(import("@/components/docs/ai-elements/node-demo"), "NodeDemo"),
  ),
  panel: lazy(() =>
    wrap(import("@/components/docs/ai-elements/panel-demo"), "PanelDemo"),
  ),
  toolbar: lazy(() =>
    wrap(import("@/components/docs/ai-elements/toolbar-demo"), "ToolbarDemo"),
  ),
};

export function DemoLoader({ name }: { name: string }) {
  const Demo = demos[name];

  if (!Demo) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Component &ldquo;{name}&rdquo; not found
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex w-full flex-col gap-4 py-8">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-48 w-full" />
        </div>
      }
    >
      <Demo />
    </Suspense>
  );
}
