import type { LLMConfig, LLMProvider } from "../types.js";
import { createAnthropicProvider } from "./anthropic.js";
import { createOpenAIProvider } from "./openai.js";

export function createProvider(config: LLMConfig): LLMProvider {
  switch (config.provider) {
    case "anthropic":
      return createAnthropicProvider({
        apiKey: config.apiKey,
        model: config.model,
      });
    case "openai":
      return createOpenAIProvider({
        apiKey: config.apiKey,
        model: config.model,
      });
    default:
      throw new Error(`Unknown LLM provider: ${config.provider}`);
  }
}

export { createAnthropicProvider } from "./anthropic.js";
export { createOpenAIProvider } from "./openai.js";
export { buildThreeLayerPrompt, THREE_LAYER_SCHEMA } from "./prompt.js";
export type {
  FingerprintValidation,
  ValidationIssue,
} from "./validate-fingerprint.js";
export { validateFingerprint } from "./validate-fingerprint.js";
