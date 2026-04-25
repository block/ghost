import type { EmbeddingConfig, Expression } from "../types.js";
import { describeExpression } from "./describe.js";

/**
 * Generate a semantic embedding for an expression using an external API.
 *
 * Converts the structured expression into a natural language description,
 * then sends it to an embedding model. The resulting vector captures semantic
 * similarity — two projects using `bg-slate-900` and `--color-gray-900: #0f172a`
 * will land nearby because the model understands they express the same intent.
 *
 * Supported providers:
 *   - openai: Uses text-embedding-3-small (default). Set OPENAI_API_KEY env var.
 *   - voyage: Uses voyage-3 (default). Set VOYAGE_API_KEY env var.
 */
export async function computeSemanticEmbedding(
  expression: Expression,
  config: EmbeddingConfig,
): Promise<number[]> {
  const text = describeExpression(expression);
  const [vec] = await embedTexts([text], config);
  return vec;
}

/**
 * Embed a batch of texts in one API call.
 *
 * Returns one vector per input in the same order. Used to embed design
 * decisions at profile time so compare can match them by cosine similarity
 * without making API calls during comparison.
 */
export async function embedTexts(
  texts: string[],
  config: EmbeddingConfig,
): Promise<number[][]> {
  if (texts.length === 0) return [];

  switch (config.provider) {
    case "openai":
      return embedViaOpenAI(texts, config);
    case "voyage":
      return embedViaVoyage(texts, config);
    default:
      throw new Error(`Unknown embedding provider: ${config.provider}`);
  }
}

async function embedViaOpenAI(
  texts: string[],
  config: EmbeddingConfig,
): Promise<number[][]> {
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
    body: JSON.stringify({ input: texts, model }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI embedding API error (${response.status}): ${body}`);
  }

  const data = (await response.json()) as {
    data: { embedding: number[]; index: number }[];
  };

  // OpenAI returns results with `index` matching input position
  const ordered = new Array<number[]>(texts.length);
  for (const item of data.data) {
    ordered[item.index] = item.embedding;
  }
  return ordered;
}

async function embedViaVoyage(
  texts: string[],
  config: EmbeddingConfig,
): Promise<number[][]> {
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
    body: JSON.stringify({ input: texts, model }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Voyage embedding API error (${response.status}): ${body}`);
  }

  const data = (await response.json()) as {
    data: { embedding: number[]; index?: number }[];
  };

  // Voyage preserves input order in `data[]`
  return data.data.map((d) => d.embedding);
}
