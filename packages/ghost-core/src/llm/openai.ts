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

interface OpenAIClient {
  chat: {
    completions: {
      create(opts: {
        model: string;
        max_tokens: number;
        response_format?: { type: string };
        messages: { role: string; content: string; tool_call_id?: string }[];
        tools?: unknown[];
      }): Promise<{
        choices: {
          message?: {
            content?: string;
            tool_calls?: {
              id: string;
              function: { name: string; arguments: string };
            }[];
          };
          finish_reason?: string;
        }[];
      }>;
    };
  };
}

export function createOpenAIProvider(options: {
  apiKey?: string;
  model?: string;
}): LLMProvider {
  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
  const model = options.model ?? "gpt-4o";

  if (!apiKey) {
    throw new Error(
      "OpenAI API key required. Set OPENAI_API_KEY env var or llm.apiKey in config.",
    );
  }

  return {
    name: "openai",

    async interpret(
      material: SampledMaterial,
      projectId: string,
    ): Promise<DesignFingerprint> {
      // Dynamic import — openai is an optional peer dependency
      let sdk: { default: new (opts: { apiKey: string }) => OpenAIClient };
      try {
        sdk = await (Function('return import("openai")')() as Promise<
          typeof sdk
        >);
      } catch {
        throw new Error("OpenAI SDK not installed. Run: pnpm add openai");
      }

      const client = new sdk.default({ apiKey });

      const fileContents = material.files
        .map((f) => `--- ${f.path} (${f.reason}) ---\n${f.content}`)
        .join("\n\n");

      const prompt = buildFingerprintPrompt(projectId, fileContents);

      const response = await client.chat.completions.create({
        model,
        max_tokens: 4096,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a design system analyst. Always respond with valid JSON.",
          },
          { role: "user", content: prompt },
        ],
      });

      const text = response.choices[0]?.message?.content ?? "";

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
      let sdk: { default: new (opts: { apiKey: string }) => OpenAIClient };
      try {
        sdk = await (Function('return import("openai")')() as Promise<
          typeof sdk
        >);
      } catch {
        throw new Error("OpenAI SDK not installed. Run: pnpm add openai");
      }

      const client = new sdk.default({ apiKey });

      // Convert messages to OpenAI format
      const openaiMessages = messages.map((m) => {
        if (m.role === "tool") {
          return {
            role: "tool" as const,
            content: m.content,
            tool_call_id: m.tool_call_id ?? "",
          };
        }
        return { role: m.role, content: m.content };
      });

      // Convert tools to OpenAI function format
      const openaiTools = tools?.map((t) => ({
        type: "function" as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.input_schema,
        },
      }));

      const response = await client.chat.completions.create({
        model,
        max_tokens: 4096,
        messages: openaiMessages,
        ...(openaiTools?.length ? { tools: openaiTools } : {}),
      });

      const choice = response.choices[0];
      const msg = choice?.message;

      return {
        content: msg?.content ?? undefined,
        tool_calls: msg?.tool_calls?.map((tc) => ({
          id: tc.id,
          name: tc.function.name,
          args: JSON.parse(tc.function.arguments),
        })),
        stop_reason: choice?.finish_reason ?? undefined,
      };
    },
  };
}
