import type {
  WorkbenchAdvisoryFinding,
  WorkbenchAIReviewState,
  WorkbenchCheckReport,
} from "../shared";

export interface WorkbenchAIReviewInput {
  scenarioTitle: string;
  sampleTitle: string;
  reviewPacketMarkdown: string;
  checkReport: WorkbenchCheckReport;
}

export interface WorkbenchAIReviewOptions {
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
}

const DEFAULT_TIMEOUT_MS = 20_000;
const CATEGORIES = new Set<WorkbenchAdvisoryFinding["category"]>([
  "fix",
  "intentional-divergence",
  "missing-memory",
  "experience-gap",
  "eval-uncertainty",
]);
const SEVERITIES = new Set<WorkbenchAdvisoryFinding["severity"]>([
  "info",
  "nit",
  "serious",
  "critical",
]);

export async function reviewDriftWithAI(
  input: WorkbenchAIReviewInput,
  options: WorkbenchAIReviewOptions = {},
): Promise<WorkbenchAIReviewState> {
  const env = options.env ?? process.env;
  const provider = env.GHOST_WORKBENCH_AI_PROVIDER;
  const baseUrl = env.GHOST_WORKBENCH_AI_BASE_URL;
  const apiKey = env.GHOST_WORKBENCH_AI_API_KEY;
  const model = env.GHOST_WORKBENCH_AI_MODEL;

  if (provider !== "openai-compatible" || !baseUrl || !apiKey || !model) {
    return {
      state: "not_configured",
      provider: "none",
      message:
        "AI review is not configured. Set GHOST_WORKBENCH_AI_PROVIDER=openai-compatible plus base URL, API key, and model to run advisory review.",
      findings: [],
    };
  }

  const timeoutMs = Number(
    env.GHOST_WORKBENCH_AI_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS,
  );
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await (options.fetchImpl ?? fetch)(
      `${baseUrl.replace(/\/+$/, "")}/chat/completions`,
      {
        body: JSON.stringify({
          model,
          temperature: 0,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "You are Ghost Workbench's advisory drift reviewer. Return JSON only. Advisory findings never override deterministic active checks.",
            },
            {
              role: "user",
              content: buildReviewPrompt(input),
            },
          ],
        }),
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        method: "POST",
        signal: controller.signal,
      },
    );
    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    };
    if (!response.ok) {
      return {
        state: "error",
        provider: "openai-compatible",
        model,
        message:
          body.error?.message ?? `AI review failed with ${response.status}.`,
        findings: [],
      };
    }

    const rawText = body.choices?.[0]?.message?.content ?? "";
    let findings: WorkbenchAdvisoryFinding[];
    try {
      findings = parseFindings(rawText);
    } catch (error) {
      return {
        state: "error",
        provider: "openai-compatible",
        model,
        message:
          error instanceof Error
            ? error.message
            : "AI review returned invalid JSON.",
        findings: [],
        rawText,
      };
    }
    return {
      state: "ok",
      provider: "openai-compatible",
      model,
      message: `AI review returned ${findings.length} advisory finding(s).`,
      findings,
      rawText,
    };
  } catch (error) {
    return {
      state: "error",
      provider: "openai-compatible",
      model,
      message:
        error instanceof Error
          ? `AI review failed: ${error.message}`
          : "AI review failed.",
      findings: [],
    };
  } finally {
    clearTimeout(timeout);
  }
}

function buildReviewPrompt(input: WorkbenchAIReviewInput): string {
  return `Review this canned Ghost Workbench drift scenario.

Scenario: ${input.scenarioTitle}
Sample: ${input.sampleTitle}
Deterministic check result: ${input.checkReport.result}
Deterministic findings: ${input.checkReport.findings.length}

Return JSON with this exact shape:
{
  "findings": [
    {
      "category": "fix | intentional-divergence | missing-memory | experience-gap | eval-uncertainty",
      "severity": "info | nit | serious | critical",
      "title": "short title",
      "path": "optional file path",
      "line": 1,
      "message": "one paragraph",
      "evidence": ["diff location or fingerprint ref"],
      "repair": "optional repair"
    }
  ]
}

Do not mark advisory-only review findings as blocking. Cite deterministic check refs when present.

${input.reviewPacketMarkdown}`;
}

function parseFindings(rawText: string): WorkbenchAdvisoryFinding[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error("AI review returned invalid JSON.");
  }
  if (!isPlainObject(parsed) || !Array.isArray(parsed.findings)) {
    throw new Error("AI review JSON must contain a findings array.");
  }
  return parsed.findings.slice(0, 12).map(normalizeFinding);
}

function normalizeFinding(value: unknown): WorkbenchAdvisoryFinding {
  if (!isPlainObject(value)) {
    throw new Error("Each AI finding must be an object.");
  }
  const category = CATEGORIES.has(
    value.category as WorkbenchAdvisoryFinding["category"],
  )
    ? (value.category as WorkbenchAdvisoryFinding["category"])
    : "eval-uncertainty";
  const severity = SEVERITIES.has(
    value.severity as WorkbenchAdvisoryFinding["severity"],
  )
    ? (value.severity as WorkbenchAdvisoryFinding["severity"])
    : "info";
  const evidence = Array.isArray(value.evidence)
    ? value.evidence.filter((item): item is string => typeof item === "string")
    : [];
  return {
    category,
    severity,
    title: typeof value.title === "string" ? value.title : "Advisory finding",
    ...(typeof value.path === "string" ? { path: value.path } : {}),
    ...(typeof value.line === "number" ? { line: value.line } : {}),
    message: typeof value.message === "string" ? value.message : "",
    evidence,
    ...(typeof value.repair === "string" ? { repair: value.repair } : {}),
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
