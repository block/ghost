import type {
  WorkbenchAIGenerationResult,
  WorkbenchAILoopRequest,
  WorkbenchAILoopResult,
  WorkbenchAIProviderTrace,
  WorkbenchVirtualPatch,
} from "../shared";
import { generateText, type WorkbenchAIProviderOptions } from "./ai-provider";
import { resolveAIConfig } from "./ai-settings";
import { runDriftDesk } from "./drift-desk";
import { statusError } from "./inspect";
import { runPromptLab } from "./prompt-lab";
import { diffWithAddedLinesForPaths } from "./sandbox";
import { getScenario } from "./scenarios";

export interface AILoopHooks {
  aiOptions?: WorkbenchAIProviderOptions & { root?: string };
  onSandboxCreated?: (root: string) => void;
}

export async function runAILoop(
  id: string,
  request: WorkbenchAILoopRequest = {},
  hooks: AILoopHooks = {},
): Promise<WorkbenchAILoopResult> {
  const scenario = getScenario(id);
  if (!scenario) throw statusError(404, `Unknown scenario: ${id}`);
  if (!isPlainObject(request)) {
    throw statusError(400, "Request body must be a JSON object.");
  }
  if (
    request.driftSampleId !== undefined &&
    (typeof request.driftSampleId !== "string" ||
      !scenario.driftSamples.some(
        (sample) => sample.id === request.driftSampleId,
      ))
  ) {
    throw statusError(400, `Unknown drift sample: ${request.driftSampleId}`);
  }
  if (
    request.includeAcceptedDecisions !== undefined &&
    typeof request.includeAcceptedDecisions !== "boolean"
  ) {
    throw statusError(400, "includeAcceptedDecisions must be a boolean.");
  }

  const config =
    hooks.aiOptions?.config ?? (await resolveAIConfig(hooks.aiOptions));
  const promptLab = await runPromptLab(
    id,
    { ...request, runAI: true },
    { aiOptions: { ...hooks.aiOptions, config } },
  );
  const generation = toGeneration(promptLab.runner);
  const providerTrace: WorkbenchAIProviderTrace[] = [
    traceFromGeneration("Generate implementation", generation, false),
  ];
  const timeline: WorkbenchAILoopResult["timeline"] = [
    {
      label: "Interpret prompt",
      state: "ok",
      detail: promptLab.interpretation.intent,
    },
    {
      label: "Generate implementation",
      state: generation.state === "ok" ? "ok" : "error",
      detail: generation.message,
    },
  ];

  const virtualPatch = await buildVirtualPatch(id, request, generation, {
    ...hooks.aiOptions,
    config,
  });
  if (virtualPatch.trace) providerTrace.push(virtualPatch.trace);
  timeline.push(virtualPatch.timeline);

  if (!virtualPatch.patch) {
    return {
      scenario: promptLab.scenario,
      promptLab,
      generation,
      contexts: [],
      timeline,
      providerTrace,
    };
  }

  const driftDesk = await runDriftDesk(
    id,
    {
      diffText: virtualPatch.patch.diffText,
      ...(typeof request.includeAcceptedDecisions === "boolean"
        ? { includeAcceptedDecisions: request.includeAcceptedDecisions }
        : {}),
    },
    {
      aiReviewOptions: { ...hooks.aiOptions, config },
      onSandboxCreated: hooks.onSandboxCreated,
    },
  );
  providerTrace.push({
    label: "AI advisory review",
    provider: driftDesk.aiReview.provider,
    ...(driftDesk.aiReview.model ? { model: driftDesk.aiReview.model } : {}),
    state:
      driftDesk.aiReview.state === "not_configured"
        ? "not_configured"
        : driftDesk.aiReview.state,
    message: driftDesk.aiReview.message,
    jsonMode: true,
  });
  timeline.push(
    {
      label: "Run deterministic checks",
      state: "ok",
      detail: `${driftDesk.checkReport.result} with ${driftDesk.checkReport.findings.length} active finding(s).`,
    },
    {
      label: "Preview stance",
      state: "ok",
      detail: driftDesk.stance.summary,
    },
  );

  return {
    scenario: promptLab.scenario,
    promptLab,
    generation,
    virtualPatch: virtualPatch.patch,
    contexts: driftDesk.contexts,
    checkReport: driftDesk.checkReport,
    reviewPacket: driftDesk.reviewPacket,
    reviewPacketMarkdown: driftDesk.reviewPacketMarkdown,
    aiReview: driftDesk.aiReview,
    stance: driftDesk.stance,
    timeline,
    providerTrace,
  };
}

async function buildVirtualPatch(
  scenarioId: string,
  request: WorkbenchAILoopRequest,
  generation: WorkbenchAIGenerationResult,
  aiOptions: WorkbenchAIProviderOptions,
): Promise<{
  patch?: WorkbenchVirtualPatch;
  trace?: WorkbenchAIProviderTrace;
  timeline: WorkbenchAILoopResult["timeline"][number];
}> {
  const scenario = getScenario(scenarioId);
  const sample = request.driftSampleId
    ? scenario?.driftSamples.find((item) => item.id === request.driftSampleId)
    : undefined;
  if (request.diffText) {
    return {
      patch: {
        source: "diff-override",
        diffText: request.diffText,
        files: [],
        notes: ["Used explicit diff override from the AI Loop request."],
      },
      timeline: {
        label: "Build virtual patch",
        state: "ok",
        detail: "Used explicit diff override.",
      },
    };
  }
  if (sample) {
    return {
      patch: {
        source: "drift-sample",
        diffText: sample.diffText,
        files: [],
        notes: [`Used drift sample "${sample.title}" as the virtual patch.`],
      },
      timeline: {
        label: "Build virtual patch",
        state: "ok",
        detail: `Used drift sample "${sample.title}".`,
      },
    };
  }
  if (generation.state !== "ok" || !generation.generatedOutput) {
    return {
      timeline: {
        label: "Build virtual patch",
        state: "skipped",
        detail: "Skipped because generation did not complete.",
      },
    };
  }

  const patchRun = await generateText(
    {
      system:
        "Convert the generated proposal into a virtual patch for the canned sandbox. Return JSON only.",
      user: buildPatchPrompt(generation.generatedOutput),
      jsonMode: true,
    },
    aiOptions,
  );
  const trace = traceFromGeneration("Build virtual patch", patchRun, true);
  if (patchRun.state !== "ok" || !patchRun.rawText) {
    return {
      trace,
      timeline: {
        label: "Build virtual patch",
        state: "error",
        detail: patchRun.message,
      },
    };
  }
  try {
    return {
      patch: parseVirtualPatch(patchRun.rawText),
      trace,
      timeline: {
        label: "Build virtual patch",
        state: "ok",
        detail: "Parsed AI virtual patch JSON.",
      },
    };
  } catch (error) {
    return {
      trace,
      timeline: {
        label: "Build virtual patch",
        state: "error",
        detail:
          error instanceof Error
            ? error.message
            : "Could not parse virtual patch JSON.",
      },
    };
  }
}

function parseVirtualPatch(rawText: string): WorkbenchVirtualPatch {
  const parsed = JSON.parse(stripCodeFence(rawText)) as {
    diffText?: unknown;
    files?: unknown;
    notes?: unknown;
  };
  const files = Array.isArray(parsed.files)
    ? parsed.files
        .filter(isPlainObject)
        .map((file) => ({
          path: typeof file.path === "string" ? file.path : "",
          content: typeof file.content === "string" ? file.content : "",
          ...(typeof file.summary === "string"
            ? { summary: file.summary }
            : {}),
        }))
        .filter((file) => file.path && isSafeRelativePath(file.path))
    : [];
  const diffText =
    typeof parsed.diffText === "string" && parsed.diffText.trim()
      ? parsed.diffText
      : files.length > 0
        ? diffWithAddedLinesForPaths(
            files.map((file) => ({
              path: file.path,
              lines: file.content.split(/\r?\n/),
            })),
          )
        : "";
  if (!diffText.trim()) {
    throw new Error("AI virtual patch JSON must include diffText or files.");
  }
  return {
    source: "ai",
    diffText,
    files,
    notes: Array.isArray(parsed.notes)
      ? parsed.notes.filter((note): note is string => typeof note === "string")
      : [],
  };
}

function buildPatchPrompt(generatedOutput: string): string {
  return `Create a virtual patch for the canned Ghost Workbench sandbox.

Return JSON with this shape:
{
  "files": [{"path": "relative/path.tsx", "content": "complete virtual file content", "summary": "what changed"}],
  "diffText": "optional unified diff",
  "notes": ["short caveat"]
}

The patch is read-only and must not claim that real repo files were modified.

Generated proposal:
${generatedOutput}`;
}

function toGeneration(
  runner: WorkbenchAILoopResult["promptLab"]["runner"],
): WorkbenchAIGenerationResult {
  return {
    mode: "ai",
    state: runner.state === "not_requested" ? "not_configured" : runner.state,
    provider: runner.provider ?? "none",
    ...(runner.model ? { model: runner.model } : {}),
    message: runner.message,
    generatedOutput: runner.generatedOutput,
    ...(runner.rawText ? { rawText: runner.rawText } : {}),
    ...(runner.latencyMs !== undefined ? { latencyMs: runner.latencyMs } : {}),
    ...(runner.usage ? { usage: runner.usage } : {}),
  };
}

function traceFromGeneration(
  label: string,
  generation: WorkbenchAIGenerationResult,
  jsonMode: boolean,
): WorkbenchAIProviderTrace {
  return {
    label,
    provider: generation.provider,
    ...(generation.model ? { model: generation.model } : {}),
    state: generation.state,
    ...(generation.latencyMs !== undefined
      ? { latencyMs: generation.latencyMs }
      : {}),
    message: generation.message,
    jsonMode,
    ...(generation.usage ? { usage: generation.usage } : {}),
  };
}

function stripCodeFence(value: string): string {
  return value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

function isSafeRelativePath(value: string): boolean {
  return (
    value.length > 0 &&
    !value.startsWith("/") &&
    !value.split(/[\\/]/).includes("..")
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
