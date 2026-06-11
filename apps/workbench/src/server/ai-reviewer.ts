import type {
  WorkbenchAdvisoryFinding,
  WorkbenchAIReviewState,
  WorkbenchCheckReport,
} from "../shared";
import { generateText, type WorkbenchAIProviderOptions } from "./ai-provider";
import { resolveAIConfig } from "./ai-settings";

export interface WorkbenchAIReviewInput {
  scenarioTitle: string;
  sampleTitle: string;
  reviewPacketMarkdown: string;
  checkReport: WorkbenchCheckReport;
}

export interface WorkbenchAIReviewOptions extends WorkbenchAIProviderOptions {
  root?: string;
}

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
  const config = options.config ?? (await resolveAIConfig(options));
  if (
    !config.apiKeyConfigured &&
    config.provider !== "local-openai-compatible"
  ) {
    return {
      state: "not_configured",
      provider: "none",
      message:
        "AI review is not configured. Open AI Settings to set provider, model, base URL, and API key.",
      findings: [],
    };
  }

  const generation = await generateText(
    {
      system:
        "You are Ghost Workbench's advisory drift reviewer. Return JSON only. Advisory findings never override deterministic active checks.",
      user: buildReviewPrompt(input),
      jsonMode: true,
    },
    { ...options, config },
  );
  if (generation.state !== "ok") {
    if (generation.state === "not_configured") {
      return {
        state: "not_configured",
        provider: "none",
        ...(generation.model ? { model: generation.model } : {}),
        message: generation.message,
        findings: [],
        ...(generation.rawText ? { rawText: generation.rawText } : {}),
      };
    }
    return {
      state: "error",
      provider: generation.provider,
      ...(generation.model ? { model: generation.model } : {}),
      message: generation.message,
      findings: [],
      ...(generation.rawText ? { rawText: generation.rawText } : {}),
    };
  }
  if (generation.provider === "none") {
    return {
      state: "error",
      provider: "none",
      message: "AI review completed without a configured provider.",
      findings: [],
      ...(generation.rawText ? { rawText: generation.rawText } : {}),
    };
  }

  let findings: WorkbenchAdvisoryFinding[];
  try {
    findings = parseFindings(
      generation.rawText ?? generation.generatedOutput ?? "",
    );
  } catch (error) {
    return {
      state: "error",
      provider: generation.provider,
      model: generation.model,
      message:
        error instanceof Error
          ? error.message
          : "AI review returned invalid JSON.",
      findings: [],
      rawText: generation.rawText ?? undefined,
    };
  }
  return {
    state: "ok",
    provider: generation.provider,
    model: generation.model ?? config.model,
    message: `AI review returned ${findings.length} advisory finding(s).`,
    findings,
    rawText: generation.rawText,
  };
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
