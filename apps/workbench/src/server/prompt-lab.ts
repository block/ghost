import type {
  WorkbenchPromptInterpretation,
  WorkbenchPromptLabRequest,
  WorkbenchPromptLabResult,
  WorkbenchPromptSample,
} from "../shared";
import {
  type InspectScenarioHooks,
  inspectScenario,
  statusError,
} from "./inspect";
import { runPromptRunner } from "./prompt-runner";
import { diffFor } from "./sandbox";
import { getScenario, type ScenarioDefinition, toDetail } from "./scenarios";

const MAX_PROMPT_TEXT = 8_000;

interface PromptInterpretationWithSample {
  interpretation: WorkbenchPromptInterpretation;
  selectedSample?: WorkbenchPromptSample;
}

export async function runPromptLab(
  id: string,
  request: WorkbenchPromptLabRequest = {},
  hooks: InspectScenarioHooks = {},
): Promise<WorkbenchPromptLabResult> {
  const scenario = getScenario(id);
  if (!scenario) throw statusError(404, `Unknown scenario: ${id}`);
  assertPromptLabRequest(request);

  const { interpretation, selectedSample } = interpretPrompt(scenario, request);
  const inspection = await inspectScenario(
    id,
    {
      targetPaths: interpretation.targetPaths,
      ...(interpretation.diffText ? { diffText: interpretation.diffText } : {}),
    },
    hooks,
  );
  const handoffMarkdown = buildPromptLabHandoff(
    interpretation,
    inspection.contexts.map((context) => ({
      title: context.title,
      markdown: context.markdown,
    })),
    inspection.checkReport?.result,
  );
  const runner = await runPromptRunner({
    promptText: interpretation.promptText,
    handoffMarkdown,
  });

  return {
    scenario: toDetail(scenario),
    ...(selectedSample ? { selectedSample } : {}),
    interpretation,
    inspection,
    handoffMarkdown,
    runner,
  };
}

function interpretPrompt(
  scenario: ScenarioDefinition,
  request: WorkbenchPromptLabRequest,
): PromptInterpretationWithSample {
  const requestedSample = request.promptSampleId
    ? findSample(scenario, request.promptSampleId)
    : undefined;
  if (request.promptSampleId && !requestedSample) {
    throw statusError(400, `Unknown prompt sample: ${request.promptSampleId}`);
  }

  if (requestedSample) {
    const promptText = request.promptText ?? requestedSample.prompt;
    return interpretationFromSample(scenario, requestedSample, promptText, {
      source: "explicit-sample",
      status: "sample-match",
      request,
      matchedTerms: matchedTermsFor(requestedSample, promptText),
      rationaleLead: `Selected prompt sample "${requestedSample.title}" by id.`,
    });
  }

  if (request.promptText?.trim()) {
    const match = bestTextSample(scenario, request.promptText);
    if (match) {
      return interpretationFromSample(
        scenario,
        match.sample,
        request.promptText,
        {
          source: "freeform",
          status: "text-match",
          request,
          matchedTerms: match.terms,
          rationaleLead: `Matched freeform prompt to "${match.sample.title}" using deterministic terms.`,
        },
      );
    }
    return fallbackInterpretation(scenario, request);
  }

  const defaultSample = scenario.promptSamples[0];
  if (defaultSample) {
    return interpretationFromSample(
      scenario,
      defaultSample,
      defaultSample.prompt,
      {
        source: "default-sample",
        status: "sample-match",
        request,
        matchedTerms: defaultSample.matchTerms,
        rationaleLead: `Loaded default prompt sample "${defaultSample.title}".`,
      },
    );
  }

  return fallbackInterpretation(scenario, request);
}

function interpretationFromSample(
  scenario: ScenarioDefinition,
  sample: WorkbenchPromptSample,
  promptText: string,
  options: {
    source: WorkbenchPromptInterpretation["source"];
    status: WorkbenchPromptInterpretation["status"];
    request: WorkbenchPromptLabRequest;
    matchedTerms: string[];
    rationaleLead: string;
  },
): PromptInterpretationWithSample {
  const targetPaths =
    options.request.targetPaths ??
    sample.targetPaths ??
    scenario.defaultTargetPaths;
  const diffText =
    options.request.diffText ??
    (sample.diffPaths
      ? diffFor(...sample.diffPaths)
      : scenario.defaultDiffPaths
        ? diffFor(...scenario.defaultDiffPaths)
        : undefined);
  const overrides = {
    targetPaths: Boolean(options.request.targetPaths),
    diffText: Boolean(options.request.diffText),
  };

  return {
    selectedSample: sample,
    interpretation: {
      status: options.status,
      source: options.source,
      promptText,
      intent: sample.intent,
      matchedTerms: options.matchedTerms,
      targetPaths,
      ...(diffText ? { diffText } : {}),
      selectedSampleId: sample.id,
      expectedFocusRefs: sample.expectedFocusRefs,
      overrides,
      rationale: [
        options.rationaleLead,
        sample.targetPaths?.length
          ? `Sample targets ${sample.targetPaths.join(", ")}.`
          : "Sample does not force a target path.",
        sample.diffPaths?.length
          ? `Sample includes a canned diff for ${sample.diffPaths.join(", ")}.`
          : "Sample does not include a canned diff.",
        ...(overrides.targetPaths
          ? ["Request target paths override sample target paths."]
          : []),
        ...(overrides.diffText
          ? ["Request diff text overrides sample diff."]
          : []),
      ],
    },
  };
}

function fallbackInterpretation(
  scenario: ScenarioDefinition,
  request: WorkbenchPromptLabRequest,
): PromptInterpretationWithSample {
  const promptText = request.promptText?.trim() || "No prompt supplied.";
  const targetPaths = request.targetPaths ?? scenario.defaultTargetPaths;
  const diffText =
    request.diffText ??
    (scenario.defaultDiffPaths
      ? diffFor(...scenario.defaultDiffPaths)
      : undefined);

  return {
    interpretation: {
      status: "fallback",
      source: "fallback",
      promptText,
      intent:
        "No prompt sample matched. Falling back to the scenario defaults so the handoff remains inspectable.",
      matchedTerms: [],
      targetPaths,
      ...(diffText ? { diffText } : {}),
      expectedFocusRefs: [],
      overrides: {
        targetPaths: Boolean(request.targetPaths),
        diffText: Boolean(request.diffText),
      },
      rationale: [
        "No deterministic prompt sample matched the supplied prompt text.",
        "Using the scenario's default target paths and diff, unless the request supplied overrides.",
      ],
    },
  };
}

function bestTextSample(
  scenario: ScenarioDefinition,
  promptText: string,
): { sample: WorkbenchPromptSample; terms: string[] } | null {
  let best: { sample: WorkbenchPromptSample; terms: string[] } | null = null;

  for (const sample of scenario.promptSamples) {
    const terms = matchedTermsFor(sample, promptText);
    if (terms.length === 0) continue;
    if (!best || terms.length > best.terms.length) {
      best = { sample, terms };
    }
  }

  return best;
}

function matchedTermsFor(
  sample: WorkbenchPromptSample,
  promptText: string,
): string[] {
  const haystack = promptText.toLowerCase();
  return sample.matchTerms.filter((term) =>
    haystack.includes(term.toLowerCase()),
  );
}

function findSample(
  scenario: ScenarioDefinition,
  id: string,
): WorkbenchPromptSample | undefined {
  return scenario.promptSamples.find((sample) => sample.id === id);
}

function buildPromptLabHandoff(
  interpretation: WorkbenchPromptInterpretation,
  contexts: Array<{ title: string; markdown: string }>,
  checkResult: string | undefined,
): string {
  const parts = [
    "# Ghost Prompt Lab Handoff",
    "This is a deterministic preview of what a future agent runner would receive. No model has been called.",
    "## User Prompt",
    fenced("text", interpretation.promptText),
    "## Deterministic Interpretation",
    [
      `- Status: ${interpretation.status}`,
      `- Source: ${interpretation.source}`,
      `- Intent: ${interpretation.intent}`,
      `- Target paths: ${interpretation.targetPaths.map((path) => `\`${path}\``).join(", ") || "none"}`,
      `- Diff-backed: ${interpretation.diffText ? "yes" : "no"}`,
      `- Target override: ${interpretation.overrides.targetPaths ? "yes" : "no"}`,
      `- Diff override: ${interpretation.overrides.diffText ? "yes" : "no"}`,
      `- Expected focus refs: ${interpretation.expectedFocusRefs.map((ref) => `\`${ref}\``).join(", ") || "none"}`,
      ...interpretation.rationale.map((line) => `- Why: ${line}`),
    ].join("\n"),
    "## Selected Context",
    contexts
      .map(
        (context, index) =>
          `### ${context.title || `Context ${index + 1}`}\n\n${context.markdown.trim()}`,
      )
      .join("\n\n"),
    "## Check Report",
    checkResult
      ? `- Diff-backed check result: ${checkResult}.`
      : "- No diff-backed check report for this prompt.",
    "## AI Runner",
    "- Mode: none.",
    "- State: not_configured.",
    "- Generated output: none.",
  ];
  return `${parts.join("\n\n").trim()}\n`;
}

function fenced(language: string, value: string): string {
  return `\`\`\`${language}\n${value.trim()}\n\`\`\``;
}

function assertPromptLabRequest(request: WorkbenchPromptLabRequest): void {
  if (!isPlainObject(request)) {
    throw statusError(400, "Request body must be a JSON object.");
  }
  if (
    request.promptSampleId !== undefined &&
    (typeof request.promptSampleId !== "string" ||
      request.promptSampleId.length === 0)
  ) {
    throw statusError(400, "promptSampleId must be a non-empty string.");
  }
  if (
    request.promptText !== undefined &&
    (typeof request.promptText !== "string" ||
      request.promptText.length > MAX_PROMPT_TEXT)
  ) {
    throw statusError(
      400,
      `promptText must be a string shorter than ${MAX_PROMPT_TEXT} characters.`,
    );
  }
  if (
    request.targetPaths !== undefined &&
    (!Array.isArray(request.targetPaths) ||
      !request.targetPaths.every(isSafeRelativePath))
  ) {
    throw statusError(
      400,
      "targetPaths must be an array of relative sandbox paths.",
    );
  }
  if (
    request.diffText !== undefined &&
    (typeof request.diffText !== "string" || request.diffText.length > 100_000)
  ) {
    throw statusError(
      400,
      "diffText must be a string shorter than 100000 characters.",
    );
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isSafeRelativePath(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !value.startsWith("/") &&
    !value.split(/[\\/]/).includes("..")
  );
}
