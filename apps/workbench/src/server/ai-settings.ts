import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  WorkbenchAIConnectionTestResult,
  WorkbenchAIProvider,
  WorkbenchAISettings,
  WorkbenchAISettingsUpdate,
} from "../shared";
import { generateText, type WorkbenchAIProviderOptions } from "./ai-provider";
import { statusError } from "./inspect";

const WORKBENCH_ENV_KEYS = [
  "GHOST_WORKBENCH_AI_PROVIDER",
  "GHOST_WORKBENCH_AI_MODEL",
  "GHOST_WORKBENCH_AI_API_KEY",
  "GHOST_WORKBENCH_AI_BASE_URL",
  "GHOST_WORKBENCH_AI_TIMEOUT_MS",
] as const;

const PROVIDERS: WorkbenchAIProvider[] = [
  "openai-compatible",
  "anthropic",
  "google",
  "local-openai-compatible",
];

const PROVIDER_DEFAULTS: WorkbenchAISettings["defaults"] = [
  {
    provider: "openai-compatible",
    label: "OpenAI-compatible",
    model: "gpt-5.5",
    baseUrl: "https://api.openai.com/v1",
    requiresApiKey: true,
  },
  {
    provider: "anthropic",
    label: "Anthropic",
    model: "claude-sonnet-4-5",
    baseUrl: "https://api.anthropic.com/v1",
    requiresApiKey: true,
  },
  {
    provider: "google",
    label: "Google Gemini",
    model: "gemini-2.5-pro",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    requiresApiKey: true,
  },
  {
    provider: "local-openai-compatible",
    label: "Local OpenAI-compatible",
    model: "local-model",
    baseUrl: "http://127.0.0.1:1234/v1",
    requiresApiKey: false,
  },
];

export interface WorkbenchAISettingsOptions extends WorkbenchAIProviderOptions {
  root?: string;
}

export interface ResolvedWorkbenchAIConfig {
  provider: WorkbenchAIProvider;
  model: string;
  baseUrl: string;
  apiKey?: string;
  timeoutMs: number;
  apiKeyConfigured: boolean;
}

export async function readAISettings(
  options: WorkbenchAISettingsOptions = {},
): Promise<WorkbenchAISettings> {
  const env = await readWorkbenchEnv(options);
  const provider = providerFrom(env.GHOST_WORKBENCH_AI_PROVIDER);
  const defaults = defaultsFor(provider);
  const model = env.GHOST_WORKBENCH_AI_MODEL?.trim() || defaults.model;
  const baseUrl = env.GHOST_WORKBENCH_AI_BASE_URL?.trim() || defaults.baseUrl;
  const apiKeyResolution = resolveApiKey(provider, env);
  const timeoutMs = timeoutFrom(env.GHOST_WORKBENCH_AI_TIMEOUT_MS);
  const configured =
    Boolean(model) &&
    Boolean(baseUrl) &&
    (!defaults.requiresApiKey || apiKeyResolution.configured);

  return {
    state: configured ? "configured" : "not_configured",
    provider,
    model,
    baseUrl,
    timeoutMs,
    apiKeyConfigured: apiKeyResolution.configured,
    ...(apiKeyResolution.source
      ? { apiKeySource: apiKeyResolution.source }
      : {}),
    message: configured
      ? `AI provider configured for ${provider}.`
      : "AI provider is not configured. Save provider, model, base URL, and API key to enable runs.",
    defaults: PROVIDER_DEFAULTS,
  };
}

export async function resolveAIConfig(
  options: WorkbenchAISettingsOptions = {},
): Promise<ResolvedWorkbenchAIConfig> {
  const env = await readWorkbenchEnv(options);
  const settings = await readAISettings(options);
  const apiKey = resolveApiKey(settings.provider, env).value;
  return {
    provider: settings.provider,
    model: settings.model,
    baseUrl: settings.baseUrl,
    ...(apiKey ? { apiKey } : {}),
    timeoutMs: settings.timeoutMs,
    apiKeyConfigured: settings.apiKeyConfigured,
  };
}

export async function saveAISettings(
  update: WorkbenchAISettingsUpdate,
  options: WorkbenchAISettingsOptions = {},
): Promise<WorkbenchAISettings> {
  assertSettingsUpdate(update);
  const root = options.root ?? repoRoot();
  const envPath = resolve(root, ".env.local");
  const existing = await readOptional(envPath);
  const current = parseEnv(existing ?? "");
  const values = new Map<string, string>();

  setOrPreserve(
    values,
    current,
    "GHOST_WORKBENCH_AI_PROVIDER",
    update.provider,
  );
  setOrPreserve(
    values,
    current,
    "GHOST_WORKBENCH_AI_MODEL",
    update.model?.trim(),
  );
  setOrPreserve(
    values,
    current,
    "GHOST_WORKBENCH_AI_BASE_URL",
    update.baseUrl?.trim(),
  );
  setOrPreserve(
    values,
    current,
    "GHOST_WORKBENCH_AI_API_KEY",
    update.apiKey?.trim() || undefined,
  );
  setOrPreserve(
    values,
    current,
    "GHOST_WORKBENCH_AI_TIMEOUT_MS",
    update.timeoutMs === undefined ? undefined : String(update.timeoutMs),
  );

  const next = upsertEnv(existing ?? "", values);
  await mkdir(dirname(envPath), { recursive: true });
  await writeFile(envPath, next, "utf-8");
  return readAISettings(options);
}

export async function testAIConnection(
  update: WorkbenchAISettingsUpdate = {},
  options: WorkbenchAISettingsOptions = {},
): Promise<WorkbenchAIConnectionTestResult> {
  assertSettingsUpdate(update);
  const base = await resolveAIConfig(options);
  const provider = update.provider ?? base.provider;
  const apiKey = update.apiKey?.trim() || base.apiKey;
  const config = {
    ...base,
    provider,
    ...(update.model ? { model: update.model.trim() } : {}),
    ...(update.baseUrl ? { baseUrl: update.baseUrl.trim() } : {}),
    ...(apiKey ? { apiKey } : {}),
    apiKeyConfigured: Boolean(apiKey) || provider === "local-openai-compatible",
    ...(update.timeoutMs ? { timeoutMs: update.timeoutMs } : {}),
  };
  const result = await generateText(
    {
      system:
        "Reply with a short plain-text health check. Do not include secrets.",
      user: "Say exactly: Ghost Workbench AI connection ok.",
    },
    { ...options, config },
  );
  return {
    state: result.state,
    provider: result.provider,
    ...(result.model ? { model: result.model } : {}),
    ...(result.latencyMs !== undefined ? { latencyMs: result.latencyMs } : {}),
    message:
      result.state === "ok" ? "AI connection succeeded." : result.message,
    ...(result.rawText ? { rawText: result.rawText } : {}),
  };
}

export async function readWorkbenchEnv(
  options: WorkbenchAISettingsOptions = {},
): Promise<Record<string, string | undefined>> {
  const root = options.root ?? repoRoot();
  const [envRaw, localRaw] = await Promise.all([
    readOptional(resolve(root, ".env")),
    readOptional(resolve(root, ".env.local")),
  ]);
  return {
    ...parseEnv(envRaw ?? ""),
    ...parseEnv(localRaw ?? ""),
    ...(options.env ?? process.env),
  };
}

function assertSettingsUpdate(
  update: unknown,
): asserts update is WorkbenchAISettingsUpdate {
  if (!isPlainObject(update)) {
    throw statusError(400, "Settings body must be a JSON object.");
  }
  const body = update as Record<string, unknown>;
  if (
    body.provider !== undefined &&
    (typeof body.provider !== "string" ||
      !PROVIDERS.includes(body.provider as WorkbenchAIProvider))
  ) {
    throw statusError(
      400,
      "provider must be a supported Workbench AI provider.",
    );
  }
  if (
    body.model !== undefined &&
    (typeof body.model !== "string" ||
      body.model.trim().length === 0 ||
      body.model.length > 200)
  ) {
    throw statusError(
      400,
      "model must be a non-empty string under 200 characters.",
    );
  }
  if (
    body.baseUrl !== undefined &&
    (typeof body.baseUrl !== "string" ||
      body.baseUrl.length > 500 ||
      !isValidHttpUrl(body.baseUrl))
  ) {
    throw statusError(400, "baseUrl must be a valid http(s) URL.");
  }
  if (
    body.apiKey !== undefined &&
    (typeof body.apiKey !== "string" || body.apiKey.length > 4_000)
  ) {
    throw statusError(400, "apiKey must be a string under 4000 characters.");
  }
  if (
    body.timeoutMs !== undefined &&
    (typeof body.timeoutMs !== "number" ||
      !Number.isInteger(body.timeoutMs) ||
      body.timeoutMs < 1_000 ||
      body.timeoutMs > 120_000)
  ) {
    throw statusError(400, "timeoutMs must be between 1000 and 120000.");
  }
}

function providerFrom(value: string | undefined): WorkbenchAIProvider {
  return PROVIDERS.includes(value as WorkbenchAIProvider)
    ? (value as WorkbenchAIProvider)
    : "openai-compatible";
}

function defaultsFor(provider: WorkbenchAIProvider) {
  return (
    PROVIDER_DEFAULTS.find((defaults) => defaults.provider === provider) ??
    PROVIDER_DEFAULTS[0]
  );
}

function resolveApiKey(
  provider: WorkbenchAIProvider,
  env: Record<string, string | undefined>,
): {
  configured: boolean;
  value?: string;
  source?: WorkbenchAISettings["apiKeySource"];
} {
  const workbench = env.GHOST_WORKBENCH_AI_API_KEY?.trim();
  if (workbench)
    return { configured: true, value: workbench, source: "workbench" };
  const aliasKey = aliasKeyFor(provider);
  const alias = aliasKey ? env[aliasKey]?.trim() : undefined;
  if (alias) return { configured: true, value: alias, source: "alias" };
  return {
    configured: provider === "local-openai-compatible",
    source: process.env.GHOST_WORKBENCH_AI_API_KEY ? "process" : undefined,
  };
}

function aliasKeyFor(provider: WorkbenchAIProvider): string | undefined {
  if (provider === "openai-compatible") return "OPENAI_API_KEY";
  if (provider === "anthropic") return "ANTHROPIC_API_KEY";
  if (provider === "google") return "GEMINI_API_KEY";
  return undefined;
}

function timeoutFrom(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1_000 && parsed <= 120_000
    ? parsed
    : 20_000;
}

function parseEnv(raw: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    env[key] = unquote(value);
  }
  return env;
}

function unquote(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function upsertEnv(raw: string, values: Map<string, string>): string {
  const existingLines = raw.split(/\r?\n/).filter((line) => {
    const key = line.split("=")[0]?.trim();
    return !WORKBENCH_ENV_KEYS.includes(
      key as (typeof WORKBENCH_ENV_KEYS)[number],
    );
  });
  const lines = existingLines.filter((line, index, list) => {
    if (line.trim()) return true;
    return index < list.length - 1 && list[index + 1]?.trim();
  });
  if (lines.length > 0 && lines.at(-1)?.trim()) lines.push("");
  lines.push("# Ghost Workbench AI settings");
  for (const [key, value] of values) {
    lines.push(`${key}=${quoteEnv(value)}`);
  }
  return `${lines.join("\n").replace(/\n+$/g, "")}\n`;
}

function setOrPreserve(
  values: Map<string, string>,
  current: Record<string, string>,
  key: (typeof WORKBENCH_ENV_KEYS)[number],
  next: string | undefined,
): void {
  const value = next ?? current[key];
  if (value) values.set(key, value);
}

function quoteEnv(value: string): string {
  if (/^[A-Za-z0-9_./:@-]+$/.test(value)) return value;
  return JSON.stringify(value);
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

async function readOptional(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, "utf-8");
  } catch {
    return undefined;
  }
}

function repoRoot(): string {
  return resolve(fileURLToPath(new URL("../../../../", import.meta.url)));
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
