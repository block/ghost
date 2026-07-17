# ghost UI — Agent Skills

## Overview

ghost UI is an agent-safe reference system built on shadcn/ui with:
- **Semantic authoring contract**: prefer shadcn roles like `background`, `foreground`, `card`, `popover`, `muted`, `accent`, `primary`, `destructive`, `border`, `input`, and `ring`
- **Pill-forward geometry**: 999px border-radius on buttons, inputs, and pills, with contained surfaces using named radius roles
- **System font stack**: consumers bring their own typeface; Vessel stays brand-agnostic
- **4-tier shadow hierarchy**: mini, card, elevated, modal
- **100 components** across 10 categories
- **341+ CSS custom properties** with full light/dark mode support

## Style: ghost

This registry uses the `ghost` style. Components use CVA (class-variance-authority) for variants and `data-slot` attributes for runtime introspection.

## Token System

Canonical authoring roles:
- **Surfaces**: `background`, `card`, `popover`, `muted`, `accent`, `primary`, `secondary`, `destructive`
- **Foregrounds**: `foreground`, `card-foreground`, `popover-foreground`, `muted-foreground`, `accent-foreground`, `primary-foreground`, `secondary-foreground`, `destructive-foreground`
- **Structure**: `border`, `input`, `ring`, plus shadcn `sidebar-*` roles
- **Vessel extensions**: chart colors, shadows, alpha helpers, dark technical surfaces, and component-specific radii
- **Deprecated compatibility aliases**: broad `background-*`, `text-*`, and `border-*` families still exist for older components and registry consumers. Do not use them in new component code.
- **Shadows**: `--shadow-mini`, `--shadow-card`, `--shadow-elevated`, `--shadow-modal`
- **Radii**: `--radius-pill` (999px), `--radius-button` (999px), `--radius-card` (20px), `--radius-modal` (16px)

Typography scale (magazine rhythm):
- Display: clamp(64px, 8vw, 96px), weight 900
- Section: clamp(44px, 5vw, 64px), weight 700
- Sub: clamp(28px, 3vw, 40px), weight 700
- Card: clamp(20px, 2vw, 28px), weight 600
- Body reading: clamp(1rem, 1.3vw, 1.25rem), line-height 1.65
- Label: 11px, uppercase, 0.12em letter-spacing

## Theme Presets

- **Default** (default): Monochromatic grayscale
- **Warm Sand** (warm-sand): Earthy terracotta warmth
- **Ocean** (ocean): Cool blues and teals
- **Midnight Luxe** (midnight-luxe): Deep purples and golds
- **Neon Brutalist** (neon-brutalist): High contrast, sharp edges
- **Soft Pastel** (soft-pastel): Gentle, muted pastels

## Categories

- **layout**: accordion, aspect-ratio, collapsible, resizable, scroll-area, separator, sidebar, stack, surface, canvas, connection, controls, edge, node, panel, toolbar
- **feedback**: alert-dialog, alert, dialog, drawer, popover, progress, sheet, sonner, spinner, tooltip, confirmation, shimmer
- **display**: avatar, badge, calendar, card, carousel, chart, hover-card, skeleton, surface, text, table, agent, artifact, chain-of-thought, checkpoint, context, inline-citation, plan, queue, sources, task, tool
- **navigation**: breadcrumb, command, context-menu, dropdown-menu, menubar, navigation-menu, pagination, sidebar, tabs
- **input**: button-group, button, calendar, checkbox, command, form, input-group, input-otp, input, label, radio-group, select, slider, switch, textarea, toggle-group, toggle, attachments, mic-selector, model-selector, prompt-input, speech-input, voice-selector
- **typography**: text
- **ai**: agent, artifact, attachments, audio-player, canvas, chain-of-thought, checkpoint, code-block, commit, confirmation, connection, context, controls, conversation, edge, environment-variables, file-tree, image, inline-citation, jsx-preview, message, mic-selector, model-selector, node, open-in-chat, package-info, panel, persona, plan, prompt-input, queue, reasoning, sandbox, schema-display, shimmer, snippet, sources, speech-input, stack-trace, suggestion, task, terminal, test-results, tool, toolbar, transcription, voice-selector, web-preview
- **chat**: attachments, conversation, message, open-in-chat, prompt-input, reasoning, suggestion, transcription
- **media**: audio-player, image, mic-selector, persona, speech-input, transcription, voice-selector, web-preview
- **code**: code-block, commit, environment-variables, file-tree, jsx-preview, package-info, sandbox, schema-display, snippet, stack-trace, terminal, test-results

## Agent Decision Packets

High-impact components carry `meta.agent_decision` in the registry. Read that decision packet before source code: it names the component's intent, safe variants, token roles, and common misuses so agents choose system decisions instead of copying class strings.

| Component | Intent | Token Roles | Common Misuses |
|-----------|--------|-------------|----------------|
| badge | Compact status, label, or metadata marker. | primary, muted, foreground, destructive, border | Using raw color scales for status.; Stacking many badges where a row or list would be clearer. |
| button | Primary and secondary actions with Vessel pill geometry and semantic state roles. | primary, primary-foreground, muted, foreground, destructive, ring | Adding raw palette utilities to force emphasis.; Using icon-only buttons without an accessible label.; Inventing one-off button heights instead of the size prop. |
| card | Quiet contained surface for related content, not decoration. | card, card-foreground, border, shadow-card | Adding arbitrary shadows.; Using raw gray backgrounds instead of card/background roles.; Making card titles do page-heading work. |
| command | Searchable command/list palette for selecting actions or destinations. | popover, popover-foreground, accent, accent-foreground, muted-foreground | Returning ungrouped long lists.; Using raw selected colors instead of accent roles. |
| dialog | Task-blocking overlay for decisions that must interrupt the current flow. | background, foreground, border, shadow-modal, ring | Putting full pages inside dialogs.; Hiding close affordances without a strong reason.; Using dialog for hover/preview content. |
| input | Single-line text entry with quiet tokenized focus and invalid states. | input, ring, foreground, muted-foreground, destructive | Replacing focus rings with raw colors.; Using placeholder text as the only label. |
| popover | Lightweight floating contextual surface anchored to a trigger. | popover, popover-foreground, border, shadow-popover | Overloading popovers with navigation stacks.; Using custom dark surfaces instead of popover tokens. |
| stack | Typed flex layout primitive for spacing, alignment, direction, and wrapping decisions. | spacing, layout | Adding one-off gap classes instead of the gap prop.; Using Stack to hide unclear content hierarchy. |
| surface | Typed semantic surface primitive for choosing role, padding, radius, border, and elevation without raw class strings. | background, foreground, card, popover, muted, accent, surface-dark, border, shadow-card, shadow-popover | Combining raw background classes with role props.; Adding arbitrary shadows instead of elevation.; Using Surface for every div instead of meaningful component anatomy. |
| text | Typed typography primitive for text role, tone, alignment, and balance decisions. | foreground, muted-foreground, primary-foreground, success, warning, info, destructive | Using display scale in dense product panels.; Using tone to communicate state without text or icon support. |
| code-block | Readable, copyable code and command output surface. | surface-dark, surface-dark-text, border, muted-foreground | Hardcoding syntax colors outside the highlighter.; Using code blocks as general panels. |
| message | Chat transcript message body with readable streaming/markdown behavior. | foreground, muted-foreground, message-user-bg, border | Inventing separate bubble palettes.; Mixing transcript spacing with card spacing. |
| prompt-input | Composable AI prompt composer with attachments, commands, model controls, and submit state. | background, foreground, muted-foreground, border, ring | Adding raw spacing/color overrides inside the composer.; Hiding submit/stop state from assistive tech. |
| reasoning | Collapsible reasoning/thinking trace that stays secondary to the answer. | muted, muted-foreground, border, foreground | Over-emphasizing reasoning with primary styling.; Mixing reasoning content into final response hierarchy. |
| terminal | Dark technical terminal surface for command/session output. | surface-dark, surface-dark-text, surface-dark-muted, surface-dark-border | Using zinc palette classes directly.; Using terminal surface for non-code hierarchy. |
| tool | Tool-call lifecycle display with semantic status states. | success, warning, info, destructive, muted, border | Using color as the only state cue.; Expanding every tool result by default in dense transcripts. |

## Component Reference

| Component | Categories | Exports | Variants | Data Slots |
|-----------|-----------|---------|----------|------------|
| accordion | layout |  | - | accordion, accordion-item, accordion-trigger, accordion-content |
| alert-dialog | feedback |  | - | alert-dialog, alert-dialog-trigger, alert-dialog-portal, alert-dialog-overlay, alert-dialog-content, alert-dialog-header, alert-dialog-footer, alert-dialog-title, alert-dialog-description |
| alert | feedback |  | - | alert, alert-title, alert-description |
| aspect-ratio | layout |  | - | aspect-ratio |
| avatar | display |  | - | avatar, avatar-image, avatar-fallback |
| badge | display |  | - | badge |
| breadcrumb | navigation |  | - | breadcrumb, breadcrumb-list, breadcrumb-item, breadcrumb-link, breadcrumb-page, breadcrumb-separator, breadcrumb-ellipsis |
| button-group | input |  | - | button-group, button-group-separator |
| button | input |  | - | button |
| calendar | display, input |  | - | calendar |
| card | display |  | - | card, card-header, card-title, card-description, card-action, card-content, card-footer |
| carousel | display |  | - | carousel, carousel-content, carousel-item, carousel-previous, carousel-next |
| chart | display |  | - | chart |
| checkbox | input |  | - | checkbox, checkbox-indicator |
| collapsible | layout |  | - | collapsible, collapsible-trigger, collapsible-content |
| command | input, navigation |  | - | command, command-input-wrapper, command-input, command-list, command-empty, command-group, command-separator, command-item, command-shortcut |
| context-menu | navigation |  | - | context-menu, context-menu-trigger, context-menu-group, context-menu-portal, context-menu-sub, context-menu-radio-group, context-menu-sub-trigger, context-menu-sub-content, context-menu-content, context-menu-item, context-menu-checkbox-item, context-menu-radio-item, context-menu-label, context-menu-separator, context-menu-shortcut |
| dialog | feedback |  | - | dialog, dialog-trigger, dialog-portal, dialog-close, dialog-overlay, dialog-content, dialog-header, dialog-footer, dialog-title, dialog-description |
| drawer | feedback |  | - | drawer, drawer-trigger, drawer-portal, drawer-close, drawer-overlay, drawer-content, drawer-header, drawer-footer, drawer-title, drawer-description |
| dropdown-menu | navigation |  | - | dropdown-menu, dropdown-menu-portal, dropdown-menu-trigger, dropdown-menu-content, dropdown-menu-group, dropdown-menu-item, dropdown-menu-checkbox-item, dropdown-menu-radio-group, dropdown-menu-radio-item, dropdown-menu-label, dropdown-menu-separator, dropdown-menu-shortcut, dropdown-menu-sub, dropdown-menu-sub-trigger, dropdown-menu-sub-content |
| form | input |  | - | form-item, form-label, form-control, form-description, form-message |
| hover-card | display |  | - | hover-card, hover-card-trigger, hover-card-portal, hover-card-content |
| input-group | input |  | - | input-group, input-group-addon, input-group-control |
| input-otp | input |  | - | input-otp, input-otp-group, input-otp-slot, input-otp-separator |
| input | input |  | - | input |
| label | input |  | - | label |
| menubar | navigation |  | - | menubar, menubar-menu, menubar-group, menubar-portal, menubar-radio-group, menubar-trigger, menubar-content, menubar-item, menubar-checkbox-item, menubar-radio-item, menubar-label, menubar-separator, menubar-shortcut, menubar-sub, menubar-sub-trigger, menubar-sub-content |
| navigation-menu | navigation |  | - | navigation-menu, navigation-menu-list, navigation-menu-item, navigation-menu-trigger, navigation-menu-content, navigation-menu-viewport, navigation-menu-link, navigation-menu-indicator |
| pagination | navigation |  | - | pagination, pagination-content, pagination-item, pagination-link, pagination-ellipsis |
| popover | feedback |  | - | popover, popover-trigger, popover-content, popover-anchor, popover-header, popover-title, popover-description |
| progress | feedback |  | - | progress, progress-indicator |
| radio-group | input |  | - | radio-group, radio-group-item, radio-group-indicator |
| resizable | layout |  | - | resizable-panel-group, resizable-panel, resizable-handle |
| scroll-area | layout |  | - | scroll-area, scroll-area-viewport, scroll-area-scrollbar, scroll-area-thumb |
| select | input |  | - | select, select-group, select-value, select-trigger, select-content, select-label, select-item, select-item-indicator, select-separator, select-scroll-up-button, select-scroll-down-button |
| separator | layout |  | - | separator-root |
| sheet | feedback |  | - | sheet, sheet-trigger, sheet-close, sheet-portal, sheet-overlay, sheet-content, sheet-header, sheet-footer, sheet-title, sheet-description |
| sidebar | navigation, layout |  | - | sidebar-wrapper, sidebar, sidebar-gap, sidebar-container, sidebar-inner, sidebar-trigger, sidebar-rail, sidebar-inset, sidebar-input, sidebar-header, sidebar-footer, sidebar-separator, sidebar-content, sidebar-group, sidebar-group-label, sidebar-group-action, sidebar-group-content, sidebar-menu, sidebar-menu-item, sidebar-menu-button, sidebar-menu-action, sidebar-menu-badge, sidebar-menu-skeleton, sidebar-menu-sub, sidebar-menu-sub-item, sidebar-menu-sub-button |
| skeleton | display |  | - | skeleton |
| slider | input |  | - | slider, slider-track, slider-range, slider-thumb |
| sonner | feedback |  | - | - |
| spinner | feedback |  | - | - |
| stack | layout |  | - | stack |
| surface | layout, display |  | - | surface |
| text | typography, display |  | - | text |
| switch | input |  | - | switch, switch-thumb |
| table | display |  | - | table-container, table, table-header, table-body, table-footer, table-row, table-head, table-cell, table-caption |
| tabs | navigation |  | - | tabs, tabs-list, tabs-trigger, tabs-content |
| textarea | input |  | - | textarea |
| toggle-group | input |  | - | toggle-group, toggle-group-item |
| toggle | input |  | - | toggle |
| tooltip | feedback |  | - | tooltip-provider, tooltip, tooltip-trigger, tooltip-content |
| agent | ai, display | Agent, AgentHeader, AgentContent, AgentInstructions, AgentTools, AgentTool, AgentOutput | - | - |
| artifact | ai, display | Artifact, ArtifactHeader, ArtifactClose, ArtifactTitle, ArtifactDescription, ArtifactActions, ArtifactAction, ArtifactContent | - | - |
| attachments | ai, input, chat | getMediaCategory, getAttachmentLabel, useAttachmentsContext, useAttachmentContext, Attachments, Attachment, AttachmentPreview, AttachmentInfo, AttachmentRemove, AttachmentHoverCard, AttachmentHoverCardTrigger, AttachmentHoverCardContent, AttachmentEmpty | - | - |
| audio-player | ai, media | AudioPlayer, AudioPlayerElement, AudioPlayerControlBar, AudioPlayerPlayButton, AudioPlayerSeekBackwardButton, AudioPlayerSeekForwardButton, AudioPlayerTimeDisplay, AudioPlayerTimeRange, AudioPlayerDurationDisplay, AudioPlayerMuteButton, AudioPlayerVolumeRange | - | audio-player, audio-player-element, audio-player-control-bar, audio-player-play-button, audio-player-seek-backward-button, audio-player-seek-forward-button, audio-player-time-display, audio-player-time-range, audio-player-duration-display, audio-player-mute-button, audio-player-volume-range |
| canvas | ai, layout | Canvas | - | - |
| chain-of-thought | ai, display | ChainOfThought, ChainOfThoughtHeader, ChainOfThoughtStep, ChainOfThoughtSearchResults, ChainOfThoughtSearchResult, ChainOfThoughtContent, ChainOfThoughtImage | - | - |
| checkpoint | ai, display | Checkpoint, CheckpointIcon, CheckpointTrigger | - | - |
| code-block | ai, code | highlightCode, CodeBlockContainer, CodeBlockHeader, CodeBlockTitle, CodeBlockFilename, CodeBlockActions, CodeBlockContent, CodeBlock, CodeBlockCopyButton, CodeBlockLanguageSelector, CodeBlockLanguageSelectorTrigger, CodeBlockLanguageSelectorValue, CodeBlockLanguageSelectorContent, CodeBlockLanguageSelectorItem | - | - |
| commit | ai, code | Commit, CommitHeader, CommitHash, CommitMessage, CommitMetadata, CommitSeparator, CommitInfo, CommitAuthor, CommitAuthorAvatar, CommitTimestamp, CommitActions, CommitCopyButton, CommitContent, CommitFiles, CommitFile, CommitFileInfo, CommitFileStatus, CommitFileIcon, CommitFilePath, CommitFileChanges, CommitFileAdditions, CommitFileDeletions | - | - |
| confirmation | ai, feedback | Confirmation, ConfirmationTitle, ConfirmationRequest, ConfirmationAccepted, ConfirmationRejected, ConfirmationActions, ConfirmationAction | - | - |
| connection | ai, layout | Connection | - | - |
| context | ai, display | Context, ContextTrigger, ContextContent, ContextContentHeader, ContextContentBody, ContextContentFooter, ContextInputUsage, ContextOutputUsage, ContextReasoningUsage, ContextCacheUsage | - | - |
| controls | ai, layout | Controls | - | - |
| conversation | ai, chat | Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton, messagesToMarkdown, ConversationDownload | - | - |
| edge | ai, layout | Edge | - | - |
| environment-variables | ai, code | EnvironmentVariables, EnvironmentVariablesHeader, EnvironmentVariablesTitle, EnvironmentVariablesToggle, EnvironmentVariablesContent, EnvironmentVariableGroup, EnvironmentVariableName, EnvironmentVariableValue, EnvironmentVariable, EnvironmentVariableCopyButton, EnvironmentVariableRequired | - | - |
| file-tree | ai, code | FileTree, FileTreeIcon, FileTreeName, FileTreeFolder, FileTreeFile, FileTreeActions | - | - |
| image | ai, media | Image | - | - |
| inline-citation | ai, display | InlineCitation, InlineCitationText, InlineCitationCard, InlineCitationCardTrigger, InlineCitationCardBody, InlineCitationCarousel, InlineCitationCarouselContent, InlineCitationCarouselItem, InlineCitationCarouselHeader, InlineCitationCarouselIndex, InlineCitationCarouselPrev, InlineCitationCarouselNext, InlineCitationSource, InlineCitationQuote | - | - |
| jsx-preview | ai, code | useJSXPreview, JSXPreview, JSXPreviewContent, JSXPreviewError | - | - |
| message | ai, chat | Message, MessageContent, MessageActions, MessageAction, MessageBranch, MessageBranchContent, MessageBranchSelector, MessageBranchPrevious, MessageBranchNext, MessageBranchPage, MessageResponse, MessageToolbar | - | - |
| mic-selector | ai, input, media | useAudioDevices, MicSelector, MicSelectorTrigger, MicSelectorContent, MicSelectorInput, MicSelectorList, MicSelectorEmpty, MicSelectorItem, MicSelectorLabel, MicSelectorValue | - | - |
| model-selector | ai, input | ModelSelector, ModelSelectorTrigger, ModelSelectorContent, ModelSelectorDialog, ModelSelectorInput, ModelSelectorList, ModelSelectorEmpty, ModelSelectorGroup, ModelSelectorItem, ModelSelectorShortcut, ModelSelectorSeparator, ModelSelectorLogo, ModelSelectorLogoGroup, ModelSelectorName | - | - |
| node | ai, layout | Node, NodeHeader, NodeTitle, NodeDescription, NodeAction, NodeContent, NodeFooter | - | - |
| open-in-chat | ai, chat | OpenIn, OpenInContent, OpenInItem, OpenInLabel, OpenInSeparator, OpenInTrigger, OpenInChatGPT, OpenInClaude, OpenInT3, OpenInScira, OpenInv0, OpenInCursor | - | - |
| package-info | ai, code | PackageInfoHeader, PackageInfoName, PackageInfoChangeType, PackageInfoVersion, PackageInfo, PackageInfoDescription, PackageInfoContent, PackageInfoDependencies, PackageInfoDependency | - | - |
| panel | ai, layout | Panel | - | - |
| persona | ai, media | Persona | - | - |
| plan | ai, display | Plan, PlanHeader, PlanTitle, PlanDescription, PlanAction, PlanContent, PlanFooter, PlanTrigger | - | plan, plan-header, plan-title, plan-description, plan-action, plan-content, plan-footer, plan-trigger |
| prompt-input | ai, input, chat | usePromptInputController, useProviderAttachments, PromptInputProvider, usePromptInputAttachments, LocalReferencedSourcesContext, usePromptInputReferencedSources, PromptInputActionAddAttachments, PromptInputActionAddScreenshot, PromptInput, PromptInputBody, PromptInputTextarea, PromptInputHeader, PromptInputFooter, PromptInputTools, PromptInputButton, PromptInputActionMenu, PromptInputActionMenuTrigger, PromptInputActionMenuContent, PromptInputActionMenuItem, PromptInputSubmit, PromptInputSelect, PromptInputSelectTrigger, PromptInputSelectContent, PromptInputSelectItem, PromptInputSelectValue, PromptInputHoverCard, PromptInputHoverCardTrigger, PromptInputHoverCardContent, PromptInputTabsList, PromptInputTab, PromptInputTabLabel, PromptInputTabBody, PromptInputTabItem, PromptInputCommand, PromptInputCommandInput, PromptInputCommandList, PromptInputCommandEmpty, PromptInputCommandGroup, PromptInputCommandItem, PromptInputCommandSeparator | - | - |
| queue | ai, display | QueueItem, QueueItemIndicator, QueueItemContent, QueueItemDescription, QueueItemActions, QueueItemAction, QueueItemAttachment, QueueItemImage, QueueItemFile, QueueList, QueueSection, QueueSectionTrigger, QueueSectionLabel, QueueSectionContent, Queue | - | - |
| reasoning | ai, chat | useReasoning, Reasoning, ReasoningTrigger, ReasoningContent | - | - |
| sandbox | ai, code | Sandbox, SandboxHeader, SandboxContent, SandboxTabs, SandboxTabsBar, SandboxTabsList, SandboxTabsTrigger, SandboxTabContent | - | - |
| schema-display | ai, code | SchemaDisplayHeader, SchemaDisplayMethod, SchemaDisplayPath, SchemaDisplayDescription, SchemaDisplayContent, SchemaDisplayParameter, SchemaDisplayParameters, SchemaDisplayProperty, SchemaDisplayRequest, SchemaDisplayResponse, SchemaDisplay, SchemaDisplayBody, SchemaDisplayExample | - | - |
| shimmer | ai, feedback | Shimmer | - | - |
| snippet | ai, code | Snippet, SnippetAddon, SnippetText, SnippetInput, SnippetCopyButton | - | - |
| sources | ai, display | Sources, SourcesTrigger, SourcesContent, Source | - | - |
| speech-input | ai, input, media | SpeechInput | - | - |
| stack-trace | ai, code | StackTrace, StackTraceHeader, StackTraceError, StackTraceErrorType, StackTraceErrorMessage, StackTraceActions, StackTraceCopyButton, StackTraceExpandButton, StackTraceContent, StackTraceFrames | - | - |
| suggestion | ai, chat | Suggestions, Suggestion | - | - |
| task | ai, display | TaskItemFile, TaskItem, Task, TaskTrigger, TaskContent | - | - |
| terminal | ai, code | TerminalHeader, TerminalTitle, TerminalStatus, TerminalActions, TerminalCopyButton, TerminalClearButton, TerminalContent, Terminal | - | - |
| test-results | ai, code | TestResultsHeader, TestResultsDuration, TestResultsSummary, TestResults, TestResultsProgress, TestResultsContent, TestSuite, TestSuiteName, TestSuiteStats, TestSuiteContent, TestName, TestDuration, TestStatus, Test, TestError, TestErrorMessage, TestErrorStack | - | - |
| tool | ai, display | Tool, getStatusBadge, ToolHeader, ToolContent, ToolInput, ToolOutput | - | - |
| toolbar | ai, layout | Toolbar | - | - |
| transcription | ai, chat, media | Transcription, TranscriptionSegment | - | transcription, transcription-segment |
| voice-selector | ai, input, media | useVoiceSelector, VoiceSelector, VoiceSelectorTrigger, VoiceSelectorContent, VoiceSelectorDialog, VoiceSelectorInput, VoiceSelectorList, VoiceSelectorEmpty, VoiceSelectorGroup, VoiceSelectorItem, VoiceSelectorShortcut, VoiceSelectorSeparator, VoiceSelectorGender, VoiceSelectorAccent, VoiceSelectorAge, VoiceSelectorName, VoiceSelectorDescription, VoiceSelectorAttributes, VoiceSelectorBullet, VoiceSelectorPreview | - | - |
| web-preview | ai, media | WebPreview, WebPreviewNavigation, WebPreviewNavigationButton, WebPreviewUrl, WebPreviewBody, WebPreviewConsole | - | - |

## Usage Patterns

### ThemeProvider
```tsx
import { ThemeProvider } from "@/lib/theme-provider"
<ThemeProvider defaultTheme="system" storageKey="theme">
  {children}
</ThemeProvider>
```

### Import Aliases
- `@/components/ui/*` — UI primitives
- `@/components/ai-elements/*` — AI-native components
- `@/lib/utils` — `cn()` utility (clsx + tailwind-merge)
- `@/lib/theme-provider` — ThemeProvider context

### Icon Library
Uses `lucide-react` for all icons.

### Dark Mode
Toggle via `.dark` class on `document.documentElement`. ThemeProvider handles this automatically.
