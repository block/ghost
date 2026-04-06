import type { DesignFingerprint, EmbeddingConfig } from "../types.js";
import { describeFingerprint } from "./describe.js";

/**
 * Generate a semantic embedding for a fingerprint using an external API.
 *
 * Converts the structured fingerprint into a natural language description,
 * then sends it to an embedding model. The resulting vector captures semantic
 * similarity — two projects using `bg-slate-900` and `--color-gray-900: #0f172a`
 * will land nearby because the model understands they express the same intent.
 *
 * Supported providers:
 *   - openai: Uses text-embedding-3-small (default). Set OPENAI_API_KEY env var.
 *   - voyage: Uses voyage-3 (default). Set VOYAGE_API_KEY env var.
 */
export async function computeSemanticEmbedding(
  fingerprint: DesignFingerprint,
  config: EmbeddingConfig,
): Promise<number[]> {
  const text = describeFingerprint(fingerprint);

  switch (config.provider) {
    case "openai":
      return embedViaOpenAI(text, config);
    case "voyage":
      return embedViaVoyage(text, config);
    default:
      throw new Error(`Unknown embedding provider: ${config.provider}`);
  }
}

async function embedViaOpenAI(
  text: string,
  config: EmbeddingConfig,
): Promise<number[]> {
  const apiKey = config.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OpenAI API key required for embeddings. Set OPENAI_API_KEY env var or embedding.apiKey in config.",
    );
  }

  const model = config.model ?? "text-embedding-3-small";

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input: text, model }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI embedding API error (${response.status}): ${body}`);
  }

  const data = (await response.json()) as {
    data: { embedding: number[] }[];
  };

  return data.data[0].embedding;
}

async function embedViaVoyage(
  text: string,
  config: EmbeddingConfig,
): Promise<number[]> {
  const apiKey = config.apiKey ?? process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Voyage API key required for embeddings. Set VOYAGE_API_KEY env var or embedding.apiKey in config.",
    );
  }

  const model = config.model ?? "voyage-3";

  const response = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input: [text], model }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Voyage embedding API error (${response.status}): ${body}`);
  }

  const data = (await response.json()) as {
    data: { embedding: number[] }[];
  };

  return data.data[0].embedding;
}
