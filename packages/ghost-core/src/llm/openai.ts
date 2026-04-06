import type {
  DesignFingerprint,
  ExtractedMaterial,
  LLMProvider,
} from "../types.js";
import { buildFingerprintPrompt } from "./prompt.js";
import { summarizeMaterial } from "./summarize.js";

interface OpenAIClient {
  chat: {
    completions: {
      create(opts: {
        model: string;
        max_tokens: number;
        response_format: { type: string };
        messages: { role: string; content: string }[];
      }): Promise<{
        choices: { message?: { content?: string } }[];
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
      material: ExtractedMaterial,
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

      const summarized = summarizeMaterial(material);
      const prompt = buildFingerprintPrompt(projectId, summarized);

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
  };
}
