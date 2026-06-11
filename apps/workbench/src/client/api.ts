import type {
  WorkbenchDriftDeskRequest,
  WorkbenchDriftDeskResult,
  WorkbenchFingerprintStudioResult,
  WorkbenchInspectionRequest,
  WorkbenchInspectionResult,
  WorkbenchPromptLabRequest,
  WorkbenchPromptLabResult,
  WorkbenchScenarioDetail,
  WorkbenchScenarioSummary,
} from "../shared";

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body?.error?.message ?? "Workbench API request failed.");
  }
  return body as T;
}

export async function fetchScenarios(): Promise<WorkbenchScenarioSummary[]> {
  const body = await readJson<{ scenarios: WorkbenchScenarioSummary[] }>(
    await fetch("/api/scenarios"),
  );
  return body.scenarios;
}

export async function fetchScenario(
  id: string,
): Promise<WorkbenchScenarioDetail> {
  const body = await readJson<{ scenario: WorkbenchScenarioDetail }>(
    await fetch(`/api/scenarios/${encodeURIComponent(id)}`),
  );
  return body.scenario;
}

export async function inspectScenario(
  id: string,
  request: WorkbenchInspectionRequest = {},
): Promise<WorkbenchInspectionResult> {
  const body = await readJson<{ result: WorkbenchInspectionResult }>(
    await fetch(`/api/scenarios/${encodeURIComponent(id)}/inspect`, {
      body: JSON.stringify(request),
      headers: { "content-type": "application/json" },
      method: "POST",
    }),
  );
  return body.result;
}

export async function runPromptLab(
  id: string,
  request: WorkbenchPromptLabRequest = {},
): Promise<WorkbenchPromptLabResult> {
  const body = await readJson<{ result: WorkbenchPromptLabResult }>(
    await fetch(`/api/scenarios/${encodeURIComponent(id)}/prompt-lab`, {
      body: JSON.stringify(request),
      headers: { "content-type": "application/json" },
      method: "POST",
    }),
  );
  return body.result;
}

export async function runDriftDesk(
  id: string,
  request: WorkbenchDriftDeskRequest = {},
): Promise<WorkbenchDriftDeskResult> {
  const body = await readJson<{ result: WorkbenchDriftDeskResult }>(
    await fetch(`/api/scenarios/${encodeURIComponent(id)}/drift-desk`, {
      body: JSON.stringify(request),
      headers: { "content-type": "application/json" },
      method: "POST",
    }),
  );
  return body.result;
}

export async function fetchFingerprintStudio(
  id: string,
): Promise<WorkbenchFingerprintStudioResult> {
  const body = await readJson<{ result: WorkbenchFingerprintStudioResult }>(
    await fetch(`/api/scenarios/${encodeURIComponent(id)}/fingerprint-studio`),
  );
  return body.result;
}
