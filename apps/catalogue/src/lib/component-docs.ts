export type PropDef = {
  name: string;
  type: string;
  default?: string;
  description: string;
};

export type ExampleMeta = {
  name: string;
  title: string;
  description?: string;
};

export type ComponentDoc = {
  description: string;
  usage: string;
  props: PropDef[];
  composedWith: string[];
  examples: ExampleMeta[];
};

const docs: Record<string, ComponentDoc> = {
  message: {
    description:
      "Renders a single chat message with support for markdown streaming, actions, and branching.",
    usage: `import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
} from "@ghost/ui";

<Message from="assistant">
  <MessageContent>
    <MessageResponse>Hello, how can I help?</MessageResponse>
  </MessageContent>
  <MessageActions>
    <MessageAction tooltip="Copy">
      <CopyIcon className="size-3.5" />
    </MessageAction>
  </MessageActions>
</Message>`,
    props: [
      {
        name: "from",
        type: '"user" | "assistant" | "system"',
        description:
          "The role of the message sender, controls alignment and styling.",
      },
      {
        name: "children",
        type: "ReactNode",
        description:
          "Message sub-components (MessageContent, MessageActions, etc.).",
      },
    ],
    composedWith: [
      "conversation",
      "prompt-input",
      "reasoning",
      "chain-of-thought",
      "code-block",
    ],
    examples: [
      {
        name: "with-actions",
        title: "With Actions",
        description: "Message with copy and regenerate action buttons.",
      },
      {
        name: "streaming",
        title: "Streaming Response",
        description: "Message with an animated streaming indicator.",
      },
    ],
  },
  conversation: {
    description:
      "A scrollable container that auto-sticks to the bottom as new messages arrive.",
    usage: `import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@ghost/ui";

<Conversation>
  <ConversationContent>
    {messages.map((msg) => (
      <Message key={msg.id} from={msg.role}>...</Message>
    ))}
  </ConversationContent>
  <ConversationScrollButton />
</Conversation>`,
    props: [
      {
        name: "initial",
        type: '"smooth" | "instant" | "auto"',
        default: '"smooth"',
        description: "Scroll behavior when the component first mounts.",
      },
      {
        name: "resize",
        type: '"smooth" | "instant" | "auto"',
        default: '"smooth"',
        description: "Scroll behavior when content resizes.",
      },
    ],
    composedWith: ["message", "prompt-input", "reasoning"],
    examples: [
      {
        name: "with-messages",
        title: "With Messages",
        description: "Conversation with multiple user and assistant messages.",
      },
    ],
  },
  "prompt-input": {
    description:
      "A composable prompt input form with file attachments, commands, screenshots, and submit handling.",
    usage: `import {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
} from "@ghost/ui";

<PromptInput onSubmit={(msg) => console.log(msg)}>
  <PromptInputTextarea placeholder="Ask anything..." />
  <PromptInputSubmit />
</PromptInput>`,
    props: [
      {
        name: "onSubmit",
        type: "(message: PromptInputMessage, event: FormEvent) => void | Promise<void>",
        description: "Called when the user submits the prompt.",
      },
      {
        name: "accept",
        type: "string",
        description: 'MIME filter for file attachments, e.g. "image/*".',
      },
      {
        name: "maxFiles",
        type: "number",
        description: "Maximum number of attachable files.",
      },
      {
        name: "maxFileSize",
        type: "number",
        description: "Maximum file size in bytes.",
      },
      {
        name: "globalDrop",
        type: "boolean",
        default: "false",
        description: "Accept file drops anywhere on the document.",
      },
    ],
    composedWith: ["conversation", "message", "attachments"],
    examples: [
      {
        name: "with-attachments",
        title: "With Attachments",
        description: "PromptInput showing file attachment controls.",
      },
    ],
  },
  reasoning: {
    description:
      "A collapsible thinking indicator that auto-opens during streaming and auto-closes when done.",
    usage: `import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
} from "@ghost/ui";

<Reasoning isStreaming={false} duration={12}>
  <ReasoningTrigger />
  <ReasoningContent>The model's internal reasoning text...</ReasoningContent>
</Reasoning>`,
    props: [
      {
        name: "isStreaming",
        type: "boolean",
        default: "false",
        description:
          "Whether the model is currently generating reasoning tokens.",
      },
      {
        name: "duration",
        type: "number",
        description:
          "Elapsed thinking time in seconds, shown in the trigger label.",
      },
      {
        name: "open",
        type: "boolean",
        description: "Controlled open state.",
      },
      {
        name: "defaultOpen",
        type: "boolean",
        description: "Initial open state when uncontrolled.",
      },
    ],
    composedWith: ["message", "conversation", "chain-of-thought"],
    examples: [],
  },
  "chain-of-thought": {
    description:
      "Displays a step-by-step breakdown of an AI model's reasoning process with collapsible detail.",
    usage: `import {
  ChainOfThought,
  ChainOfThoughtHeader,
  ChainOfThoughtContent,
  ChainOfThoughtStep,
} from "@ghost/ui";

<ChainOfThought>
  <ChainOfThoughtHeader>Reasoning steps</ChainOfThoughtHeader>
  <ChainOfThoughtContent>
    <ChainOfThoughtStep label="Analyzing query" status="complete" />
    <ChainOfThoughtStep label="Searching docs" status="active" />
  </ChainOfThoughtContent>
</ChainOfThought>`,
    props: [
      {
        name: "open",
        type: "boolean",
        description: "Controlled open state of the collapsible.",
      },
      {
        name: "defaultOpen",
        type: "boolean",
        default: "false",
        description: "Initial open state when uncontrolled.",
      },
      {
        name: "onOpenChange",
        type: "(open: boolean) => void",
        description: "Called when the open state changes.",
      },
    ],
    composedWith: ["message", "reasoning", "conversation"],
    examples: [],
  },
  "code-block": {
    description:
      "Syntax-highlighted code viewer powered by Shiki with copy-to-clipboard, line numbers, and language selection.",
    usage: `import {
  CodeBlock,
  CodeBlockHeader,
  CodeBlockActions,
  CodeBlockCopyButton,
} from "@ghost/ui";

<CodeBlock code="console.log('hello')" language="typescript">
  <CodeBlockHeader>
    <span className="text-xs font-mono">example.ts</span>
    <CodeBlockActions>
      <CodeBlockCopyButton />
    </CodeBlockActions>
  </CodeBlockHeader>
</CodeBlock>`,
    props: [
      {
        name: "code",
        type: "string",
        description: "The source code string to highlight and display.",
      },
      {
        name: "language",
        type: "BundledLanguage",
        description:
          'The programming language for syntax highlighting (e.g. "tsx", "python").',
      },
      {
        name: "showLineNumbers",
        type: "boolean",
        default: "false",
        description: "Whether to display line numbers in the gutter.",
      },
    ],
    composedWith: ["message", "artifact", "terminal"],
    examples: [
      {
        name: "with-diff",
        title: "Multi-Language",
        description:
          "CodeBlock with a language selector for multiple snippets.",
      },
    ],
  },
  agent: {
    description:
      "Displays an AI agent configuration card with name, model, instructions, tools, and output schema.",
    usage: `import {
  Agent,
  AgentHeader,
  AgentContent,
  AgentInstructions,
} from "@ghost/ui";

<Agent>
  <AgentHeader name="Research Agent" model="gpt-4o" />
  <AgentContent>
    <AgentInstructions>Find relevant papers on the topic.</AgentInstructions>
  </AgentContent>
</Agent>`,
    props: [
      {
        name: "children",
        type: "ReactNode",
        description:
          "Agent sub-components (AgentHeader, AgentContent, AgentTools, etc.).",
      },
    ],
    composedWith: ["code-block", "message"],
    examples: [],
  },
  terminal: {
    description:
      "A terminal emulator view with ANSI color support, auto-scroll, copy, and clear actions.",
    usage: `import {
  Terminal,
  TerminalHeader,
  TerminalTitle,
  TerminalContent,
} from "@ghost/ui";

<Terminal output="$ npm install\\n\\nup to date in 0.5s" />`,
    props: [
      {
        name: "output",
        type: "string",
        description: "The terminal output string, supports ANSI escape codes.",
      },
      {
        name: "isStreaming",
        type: "boolean",
        default: "false",
        description: "Shows a blinking cursor when true.",
      },
      {
        name: "autoScroll",
        type: "boolean",
        default: "true",
        description: "Automatically scroll to the bottom when output changes.",
      },
      {
        name: "onClear",
        type: "() => void",
        description:
          "Callback to clear the terminal; enables the clear button when provided.",
      },
    ],
    composedWith: ["code-block", "agent", "message"],
    examples: [],
  },
  "file-tree": {
    description:
      "An interactive file system tree with expandable folders, file selection, and custom icons.",
    usage: `import {
  FileTree,
  FileTreeFolder,
  FileTreeFile,
} from "@ghost/ui";

<FileTree defaultExpanded={new Set(["src"])}>
  <FileTreeFolder path="src" name="src">
    <FileTreeFile path="src/index.ts" name="index.ts" />
  </FileTreeFolder>
</FileTree>`,
    props: [
      {
        name: "expanded",
        type: "Set<string>",
        description: "Controlled set of expanded folder paths.",
      },
      {
        name: "defaultExpanded",
        type: "Set<string>",
        description: "Initial set of expanded folder paths when uncontrolled.",
      },
      {
        name: "selectedPath",
        type: "string",
        description: "The currently selected file or folder path.",
      },
      {
        name: "onSelect",
        type: "(path: string) => void",
        description: "Called when a file or folder is selected.",
      },
    ],
    composedWith: ["artifact", "code-block"],
    examples: [],
  },
  artifact: {
    description:
      "A panel container for generated content with a header, close button, actions, and scrollable body.",
    usage: `import {
  Artifact,
  ArtifactHeader,
  ArtifactTitle,
  ArtifactContent,
  ArtifactClose,
} from "@ghost/ui";

<Artifact>
  <ArtifactHeader>
    <ArtifactTitle>Generated Code</ArtifactTitle>
    <ArtifactClose onClick={handleClose} />
  </ArtifactHeader>
  <ArtifactContent>...</ArtifactContent>
</Artifact>`,
    props: [
      {
        name: "children",
        type: "ReactNode",
        description:
          "Artifact sub-components (ArtifactHeader, ArtifactContent, etc.).",
      },
    ],
    composedWith: ["code-block", "file-tree", "message"],
    examples: [],
  },
  context: {
    description:
      "A hover card displaying model context window usage, token breakdown, and cost estimation.",
    usage: `import {
  Context,
  ContextTrigger,
  ContextContent,
  ContextContentHeader,
} from "@ghost/ui";

<Context usedTokens={4000} maxTokens={8000}>
  <ContextTrigger />
  <ContextContent>
    <ContextContentHeader />
  </ContextContent>
</Context>`,
    props: [
      {
        name: "usedTokens",
        type: "number",
        description: "Number of tokens used in the current context window.",
      },
      {
        name: "maxTokens",
        type: "number",
        description: "Maximum token capacity of the model.",
      },
      {
        name: "usage",
        type: "LanguageModelUsage",
        description:
          "Detailed token usage breakdown (input, output, reasoning, cache).",
      },
      {
        name: "modelId",
        type: "string",
        description: "Model identifier used for cost estimation via tokenlens.",
      },
    ],
    composedWith: ["prompt-input", "conversation"],
    examples: [],
  },
  plan: {
    description:
      "A collapsible card showing an AI-generated plan with streaming shimmer support.",
    usage: `import {
  Plan,
  PlanHeader,
  PlanTitle,
  PlanDescription,
  PlanContent,
} from "@ghost/ui";

<Plan defaultOpen>
  <PlanHeader>
    <PlanTitle>Implementation Plan</PlanTitle>
    <PlanDescription>3 steps to complete the task</PlanDescription>
  </PlanHeader>
  <PlanContent>...</PlanContent>
</Plan>`,
    props: [
      {
        name: "isStreaming",
        type: "boolean",
        default: "false",
        description:
          "Enables shimmer animation on title and description while streaming.",
      },
      {
        name: "open",
        type: "boolean",
        description: "Controlled collapsed/expanded state.",
      },
      {
        name: "defaultOpen",
        type: "boolean",
        description: "Initial open state when uncontrolled.",
      },
    ],
    composedWith: ["message", "conversation", "chain-of-thought"],
    examples: [],
  },
  button: {
    description:
      "A versatile button with multiple visual variants, sizes, and an icon-only appearance mode.",
    usage: `import { Button } from "@ghost/ui";

<Button variant="default" size="default">Click me</Button>`,
    props: [
      {
        name: "variant",
        type: '"default" | "destructive" | "outline" | "secondary" | "ghost" | "link"',
        default: '"default"',
        description: "Visual style of the button.",
      },
      {
        name: "size",
        type: '"default" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm"',
        default: '"default"',
        description: "Size preset controlling height and padding.",
      },
      {
        name: "appearance",
        type: '"default" | "icon"',
        default: '"default"',
        description:
          'Set to "icon" for square icon-only buttons that scale with size.',
      },
      {
        name: "asChild",
        type: "boolean",
        default: "false",
        description:
          "Merge props onto child element instead of rendering a <button>.",
      },
    ],
    composedWith: ["dialog", "card"],
    examples: [],
  },
  card: {
    description:
      "A content container with header, title, description, body, action slot, and footer sections.",
    usage: `import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@ghost/ui";

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description text.</CardDescription>
  </CardHeader>
  <CardContent>Body content here.</CardContent>
</Card>`,
    props: [
      {
        name: "children",
        type: "ReactNode",
        description:
          "Card sub-components (CardHeader, CardContent, CardFooter, etc.).",
      },
    ],
    composedWith: ["button", "dialog"],
    examples: [],
  },
  dialog: {
    description:
      "A modal dialog overlay with title, description, header/footer sections, and close button.",
    usage: `import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@ghost/ui";

<Dialog>
  <DialogTrigger asChild>
    <Button variant="outline">Open</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
      <DialogDescription>Description text.</DialogDescription>
    </DialogHeader>
  </DialogContent>
</Dialog>`,
    props: [
      {
        name: "open",
        type: "boolean",
        description: "Controlled open state of the dialog.",
      },
      {
        name: "onOpenChange",
        type: "(open: boolean) => void",
        description: "Called when the dialog open state changes.",
      },
    ],
    composedWith: ["button", "card"],
    examples: [],
  },
  input: {
    description:
      "A styled text input with focus ring, validation states, and file input support.",
    usage: `import { Input } from "@ghost/ui";

<Input type="text" placeholder="Enter text..." />`,
    props: [
      {
        name: "type",
        type: "string",
        default: '"text"',
        description: "HTML input type attribute.",
      },
      {
        name: "placeholder",
        type: "string",
        description: "Placeholder text shown when empty.",
      },
    ],
    composedWith: ["button", "label"],
    examples: [],
  },
  tabs: {
    description:
      "A tabbed interface for switching between panels of related content.",
    usage: `import { Tabs, TabsList, TabsTrigger, TabsContent } from "@ghost/ui";

<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Content 1</TabsContent>
  <TabsContent value="tab2">Content 2</TabsContent>
</Tabs>`,
    props: [
      {
        name: "defaultValue",
        type: "string",
        description: "The value of the tab that should be active by default.",
      },
      {
        name: "value",
        type: "string",
        description: "Controlled active tab value.",
      },
      {
        name: "onValueChange",
        type: "(value: string) => void",
        description: "Called when the active tab changes.",
      },
    ],
    composedWith: ["card"],
    examples: [],
  },
};

export function getComponentDoc(slug: string): ComponentDoc | undefined {
  return docs[slug];
}
