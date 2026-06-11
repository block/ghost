import { runGhostDriftCheck } from "../../../../packages/ghost/src/core/check";
import {
  buildReviewPacket,
  formatReviewPacketMarkdown,
} from "../../../../packages/ghost/src/review-packet";
import type {
  WorkbenchAIReviewState,
  WorkbenchCheckReport,
  WorkbenchDriftDeskRequest,
  WorkbenchDriftDeskResult,
  WorkbenchDriftSample,
  WorkbenchStancePreview,
} from "../shared";
import {
  reviewDriftWithAI,
  type WorkbenchAIReviewOptions,
} from "./ai-reviewer";
import {
  contextsFromDiff,
  type InspectScenarioHooks,
  statusError,
} from "./inspect";
import { createSandbox, diffFor, removeSandbox } from "./sandbox";
import { getScenario, type ScenarioDefinition, toDetail } from "./scenarios";

const MAX_DIFF_TEXT = 100_000;

export interface DriftDeskHooks extends InspectScenarioHooks {
  aiReviewOptions?: WorkbenchAIReviewOptions;
  aiReviewer?: (input: {
    scenarioTitle: string;
    sampleTitle: string;
    reviewPacketMarkdown: string;
    checkReport: WorkbenchCheckReport;
  }) => Promise<WorkbenchAIReviewState>;
}

export async function runDriftDesk(
  id: string,
  request: WorkbenchDriftDeskRequest = {},
  hooks: DriftDeskHooks = {},
): Promise<WorkbenchDriftDeskResult> {
  const scenario = getScenario(id);
  if (!scenario) throw statusError(404, `Unknown scenario: ${id}`);
  assertDriftDeskRequest(request);

  const selectedSample = request.driftSampleId
    ? findDriftSample(scenario, request.driftSampleId)
    : request.diffText
      ? undefined
      : scenario.driftSamples[0];
  if (request.driftSampleId && !selectedSample) {
    throw statusError(400, `Unknown drift sample: ${request.driftSampleId}`);
  }
  const diffText =
    request.diffText ?? selectedSample?.diffText ?? fallbackDiff(scenario);

  const root = await createSandbox({
    kind: scenario.sandbox,
    cache: scenario.cache,
  });

  try {
    hooks.onSandboxCreated?.(root);
    const contexts = await contextsFromDiff(root, diffText);
    const checkReport = normalizeCheckReport(
      root,
      (await runGhostDriftCheck({
        cwd: root,
        diffText,
      })) as WorkbenchCheckReport,
    );
    const reviewPacketRaw = await buildReviewPacket({
      cwd: root,
      diffText,
      includeAcceptedDecisions: Boolean(request.includeAcceptedDecisions),
    });
    const reviewPacket = normalizeValue(root, reviewPacketRaw);
    const reviewPacketMarkdown = normalizeText(
      root,
      formatReviewPacketMarkdown(reviewPacketRaw),
    );
    const sampleTitle = selectedSample?.title ?? "Custom drift diff";
    const aiReview = hooks.aiReviewer
      ? await hooks.aiReviewer({
          scenarioTitle: scenario.title,
          sampleTitle,
          reviewPacketMarkdown,
          checkReport,
        })
      : await reviewDriftWithAI(
          {
            scenarioTitle: scenario.title,
            sampleTitle,
            reviewPacketMarkdown,
            checkReport,
          },
          hooks.aiReviewOptions,
        );
    const stance = buildStancePreview(checkReport, aiReview);

    return {
      scenario: toDetail(scenario),
      ...(selectedSample ? { selectedSample } : {}),
      diffText,
      contexts,
      checkReport,
      reviewPacket,
      reviewPacketMarkdown,
      aiReview,
      stance,
    };
  } finally {
    await removeSandbox(root);
  }
}

function findDriftSample(
  scenario: ScenarioDefinition,
  id: string,
): WorkbenchDriftSample | undefined {
  return scenario.driftSamples.find((sample) => sample.id === id);
}

function fallbackDiff(scenario: ScenarioDefinition): string {
  if (scenario.defaultDiffPaths) return diffFor(...scenario.defaultDiffPaths);
  return diffFor(...scenario.defaultTargetPaths);
}

function buildStancePreview(
  checkReport: WorkbenchCheckReport,
  aiReview: WorkbenchAIReviewState,
): WorkbenchStancePreview {
  const advisorySignals = aiReview.findings.length;
  const blockingSignals = checkReport.findings.length;
  const recommendation =
    blockingSignals > 0
      ? "repair-required"
      : advisorySignals > 0
        ? "review-advisory"
        : aiReview.state === "not_configured"
          ? "needs-human-stance"
          : "aligned";
  return {
    state: "preview-only",
    recommendation,
    summary:
      blockingSignals > 0
        ? "Repair active deterministic check failures before recording any stance."
        : advisorySignals > 0
          ? "Review advisory findings with a human before accepting or declaring divergence."
          : aiReview.state === "not_configured"
            ? "AI review is not configured; deterministic checks are available, but advisory stance needs human review."
            : "No blocking or advisory drift signals were produced for this canned diff.",
    blockingSignals,
    advisorySignals,
    disabledActions: ["ack", "track", "diverge"],
    writes: [],
  };
}

function normalizeCheckReport(
  root: string,
  report: WorkbenchCheckReport,
): WorkbenchCheckReport {
  return normalizeValue(root, report) as WorkbenchCheckReport;
}

function normalizeValue(root: string, value: unknown): unknown {
  if (typeof value === "string") return normalizeText(root, value);
  if (Array.isArray(value))
    return value.map((item) => normalizeValue(root, item));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      normalizeValue(root, entry),
    ]),
  );
}

function normalizeText(root: string, value: string): string {
  const rootWithSlash = root.endsWith("/") ? root : `${root}/`;
  return value.replaceAll(rootWithSlash, "").replaceAll(root, ".");
}

function assertDriftDeskRequest(request: WorkbenchDriftDeskRequest): void {
  if (!isPlainObject(request)) {
    throw statusError(400, "Request body must be a JSON object.");
  }
  if (
    request.driftSampleId !== undefined &&
    (typeof request.driftSampleId !== "string" ||
      request.driftSampleId.length === 0)
  ) {
    throw statusError(400, "driftSampleId must be a non-empty string.");
  }
  if (
    request.diffText !== undefined &&
    (typeof request.diffText !== "string" ||
      request.diffText.length > MAX_DIFF_TEXT)
  ) {
    throw statusError(
      400,
      `diffText must be a string shorter than ${MAX_DIFF_TEXT} characters.`,
    );
  }
  if (
    request.includeAcceptedDecisions !== undefined &&
    typeof request.includeAcceptedDecisions !== "boolean"
  ) {
    throw statusError(400, "includeAcceptedDecisions must be a boolean.");
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
