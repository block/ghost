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
      messages: { role: string; content: string }[];
    }): Promise<{ content: { type: string; text?: string }[] }>;
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

      // Build file content string from sampled material
      const fileContents = material.files
        .map((f) => `--- ${f.path} (${f.reason}) ---\n${f.content}`)
        .join("\n\n");

      const prompt = buildFingerprintPrompt(projectId, fileContents, material.metadata.detectedPlatform);

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
  };
}
