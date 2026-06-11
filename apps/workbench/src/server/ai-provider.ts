import type {
  WorkbenchAIGenerationResult,
  WorkbenchAIProvider,
  WorkbenchAIUsage,
} from "../shared";

export interface WorkbenchAIProviderConfig {
  provider: WorkbenchAIProvider;
  model: string;
  baseUrl: string;
  apiKey?: string;
  timeoutMs: number;
  apiKeyConfigured: boolean;
}

export interface WorkbenchAIProviderOptions {
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
  config?: WorkbenchAIProviderConfig;
}

export interface GenerateTextInput {
  system: string;
  user: string;
  jsonMode?: boolean;
}

export async function generateText(
  input: GenerateTextInput,
  options: WorkbenchAIProviderOptions = {},
): Promise<WorkbenchAIGenerationResult> {
  const config = options.config;
  if (!config || !isConfigured(config)) {
    return {
      mode: "ai",
      state: "not_configured",
      provider: "none",
      message:
        "AI provider is not configured. Open AI Settings to set provider, model, base URL, and API key.",
      generatedOutput: null,
    };
  }

  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const fetchImpl = options.fetchImpl ?? fetch;
    const result =
      config.provider === "anthropic"
        ? await callAnthropic(input, config, fetchImpl, controller.signal)
        : config.provider === "google"
          ? await callGoogle(input, config, fetchImpl, controller.signal)
          : await callOpenAICompatible(
              input,
              config,
              fetchImpl,
              controller.signal,
            );

    return {
      mode: "ai",
      state: "ok",
      provider: config.provider,
      model: config.model,
      message: `AI run completed with ${config.provider}.`,
      generatedOutput: result.text,
      rawText: result.rawText,
      latencyMs: Date.now() - started,
      ...(result.usage ? { usage: result.usage } : {}),
    };
  } catch (error) {
    return {
      mode: "ai",
      state: "error",
      provider: config.provider,
      model: config.model,
      message:
        error instanceof Error
          ? `AI run failed: ${error.message}`
          : "AI run failed.",
      generatedOutput: null,
      latencyMs: Date.now() - started,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function isConfigured(config: WorkbenchAIProviderConfig): boolean {
  return Boolean(
    config.provider &&
      config.model &&
      config.baseUrl &&
      (config.apiKeyConfigured ||
        config.provider === "local-openai-compatible"),
  );
}

async function callOpenAICompatible(
  input: GenerateTextInput,
  config: WorkbenchAIProviderConfig,
  fetchImpl: typeof fetch,
  signal: AbortSignal,
): Promise<{ text: string; rawText: string; usage?: WorkbenchAIUsage }> {
  const response = await fetchImpl(
    `${config.baseUrl.replace(/\/+$/, "")}/chat/completions`,
    {
      body: JSON.stringify({
        model: config.model,
        temperature: 0,
        ...(input.jsonMode ? { response_format: { type: "json_object" } } : {}),
        messages: [
          { role: "system", content: input.system },
          { role: "user", content: input.user },
        ],
      }),
      headers: {
        ...(config.apiKey ? { authorization: `Bearer ${config.apiKey}` } : {}),
        "content-type": "application/json",
      },
      method: "POST",
      signal,
    },
  );
  const body = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    };
  };
  if (!response.ok)
    throw new Error(body.error?.message ?? `${response.status}`);
  const text = body.choices?.[0]?.message?.content ?? "";
  return {
    text,
    rawText: text,
    ...(body.usage
      ? {
          usage: {
            inputTokens: body.usage.prompt_tokens,
            outputTokens: body.usage.completion_tokens,
            totalTokens: body.usage.total_tokens,
          },
        }
      : {}),
  };
}

async function callAnthropic(
  input: GenerateTextInput,
  config: WorkbenchAIProviderConfig,
  fetchImpl: typeof fetch,
  signal: AbortSignal,
): Promise<{ text: string; rawText: string; usage?: WorkbenchAIUsage }> {
  const response = await fetchImpl(
    `${config.baseUrl.replace(/\/+$/, "")}/messages`,
    {
      body: JSON.stringify({
        model: config.model,
        max_tokens: 4096,
        temperature: 0,
        system: input.jsonMode
          ? `${input.system}\n\nReturn valid JSON only.`
          : input.system,
        messages: [{ role: "user", content: input.user }],
      }),
      headers: {
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
        "x-api-key": config.apiKey ?? "",
      },
      method: "POST",
      signal,
    },
  );
  const body = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
    error?: { message?: string };
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  if (!response.ok)
    throw new Error(body.error?.message ?? `${response.status}`);
  const text = body.content?.map((part) => part.text ?? "").join("") ?? "";
  return {
    text,
    rawText: text,
    ...(body.usage
      ? {
          usage: {
            inputTokens: body.usage.input_tokens,
            outputTokens: body.usage.output_tokens,
            totalTokens:
              (body.usage.input_tokens ?? 0) + (body.usage.output_tokens ?? 0),
          },
        }
      : {}),
  };
}

async function callGoogle(
  input: GenerateTextInput,
  config: WorkbenchAIProviderConfig,
  fetchImpl: typeof fetch,
  signal: AbortSignal,
): Promise<{ text: string; rawText: string; usage?: WorkbenchAIUsage }> {
  const model = config.model.startsWith("models/")
    ? config.model
    : `models/${config.model}`;
  const url = new URL(
    `${config.baseUrl.replace(/\/+$/, "")}/${model}:generateContent`,
  );
  if (config.apiKey) url.searchParams.set("key", config.apiKey);
  const response = await fetchImpl(url, {
    body: JSON.stringify({
      system_instruction: { parts: [{ text: input.system }] },
      contents: [{ role: "user", parts: [{ text: input.user }] }],
      generationConfig: {
        temperature: 0,
        ...(input.jsonMode ? { responseMimeType: "application/json" } : {}),
      },
    }),
    headers: { "content-type": "application/json" },
    method: "POST",
    signal,
  });
  const body = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    error?: { message?: string };
    usageMetadata?: {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
      totalTokenCount?: number;
    };
  };
  if (!response.ok)
    throw new Error(body.error?.message ?? `${response.status}`);
  const text =
    body.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("") ?? "";
  return {
    text,
    rawText: text,
    ...(body.usageMetadata
      ? {
          usage: {
            inputTokens: body.usageMetadata.promptTokenCount,
            outputTokens: body.usageMetadata.candidatesTokenCount,
            totalTokens: body.usageMetadata.totalTokenCount,
          },
        }
      : {}),
  };
}
