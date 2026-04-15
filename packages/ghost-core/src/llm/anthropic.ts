import type {
  ChatMessage,
  ChatResponse,
  ToolDefinition,
} from "../agents/tools/types.js";
import type {
  DesignFingerprint,
  LLMProvider,
  SampledMaterial,
} from "../types.js";
import { buildFingerprintPrompt } from "./prompt.js";

interface AnthropicClient {
  messages: {
    create(opts: {
      model: string;
      max_tokens: number;
      messages: { role: string; content: unknown }[];
      tools?: unknown[];
    }): Promise<{
      content: {
        type: string;
        text?: string;
        id?: string;
        name?: string;
        input?: Record<string, unknown>;
      }[];
      stop_reason?: string;
    }>;
  };
}

export function createAnthropicProvider(options: {
  apiKey?: string;
  model?: string;
}): LLMProvider {
  const apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY;
  const model = options.model ?? "claude-sonnet-4-20250514";

  if (!apiKey) {
    throw new Error(
      "Anthropic API key required. Set ANTHROPIC_API_KEY env var or llm.apiKey in config.",
    );
  }

  return {
    name: "anthropic",

    async interpret(
      material: SampledMaterial,
      projectId: string,
    ): Promise<DesignFingerprint> {
      // Dynamic import — @anthropic-ai/sdk is an optional peer dependency
      let sdk: { default: new (opts: { apiKey: string }) => AnthropicClient };
      try {
        sdk = await (Function(
          'return import("@anthropic-ai/sdk")',
        )() as Promise<typeof sdk>);
      } catch {
        throw new Error(
          "Anthropic SDK not installed. Run: pnpm add @anthropic-ai/sdk",
        );
      }

      const client = new sdk.default({ apiKey });

      const fileContents = material.files
        .map((f) => `--- ${f.path} (${f.reason}) ---\n${f.content}`)
        .join("\n\n");

      const prompt = buildFingerprintPrompt(projectId, fileContents);

      const response = await client.messages.create({
        model,
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      });

      const firstBlock = response.content[0] as { type: string; text?: string };
      const text = firstBlock.type === "text" ? (firstBlock.text ?? "") : "";

      // Parse JSON from response (handle potential markdown wrapping)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Failed to extract JSON from LLM response");
      }

      const fingerprint: DesignFingerprint = JSON.parse(jsonMatch[0]);
      fingerprint.source = "llm";
      fingerprint.timestamp = new Date().toISOString();

      return fingerprint;
    },

    async chat(
      messages: ChatMessage[],
      tools?: ToolDefinition[],
    ): Promise<ChatResponse> {
      let sdk: { default: new (opts: { apiKey: string }) => AnthropicClient };
      try {
        sdk = await (Function(
          'return import("@anthropic-ai/sdk")',
        )() as Promise<typeof sdk>);
      } catch {
        throw new Error(
          "Anthropic SDK not installed. Run: pnpm add @anthropic-ai/sdk",
        );
      }

      const client = new sdk.default({ apiKey });

      // Convert messages to Anthropic format
      const anthropicMessages = messages.map((m) => {
        if (m.role === "tool") {
          return {
            role: "user" as const,
            content: [
              {
                type: "tool_result",
                tool_use_id: m.tool_call_id ?? "",
                content: m.content,
              },
            ],
          };
        }
        if (m.role === "assistant" && m.tool_calls?.length) {
          return {
            role: "assistant" as const,
            content: m.tool_calls.map((tc) => ({
              type: "tool_use",
              id: tc.id,
              name: tc.name,
              input: tc.args,
            })),
          };
        }
        return { role: m.role as "user" | "assistant", content: m.content };
      });

      // Convert tools to Anthropic format
      const anthropicTools = tools?.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.input_schema,
      }));

      const response = await client.messages.create({
        model,
        max_tokens: 4096,
        messages: anthropicMessages,
        ...(anthropicTools?.length ? { tools: anthropicTools } : {}),
      });

      // Parse response
      const textBlocks = response.content.filter((b) => b.type === "text");
      const toolUseBlocks = response.content.filter(
        (b) => b.type === "tool_use",
      );

      return {
        content: textBlocks.map((b) => b.text ?? "").join("") || undefined,
        tool_calls:
          toolUseBlocks.length > 0
            ? toolUseBlocks.map((b) => ({
                id: b.id ?? "",
                name: b.name ?? "",
                args: (b.input as Record<string, unknown>) ?? {},
              }))
            : undefined,
        stop_reason: response.stop_reason,
      };
    },
  };
}
