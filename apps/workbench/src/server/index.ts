import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  WorkbenchAILoopRequest,
  WorkbenchAISettingsUpdate,
  WorkbenchDriftDeskRequest,
  WorkbenchErrorResponse,
  WorkbenchInspectionRequest,
  WorkbenchPromptLabRequest,
} from "../shared";
import { runAILoop } from "./ai-loop";
import type { WorkbenchAIProviderOptions } from "./ai-provider";
import {
  readAISettings,
  saveAISettings,
  testAIConnection,
} from "./ai-settings";
import { runDriftDesk } from "./drift-desk";
import { runFingerprintStudio } from "./fingerprint-studio";
import { inspectScenario } from "./inspect";
import { runPromptLab } from "./prompt-lab";
import { getScenarioDetail, listScenarioSummaries } from "./scenarios";

const DEFAULT_PORT = 8787;
const MAX_BODY_BYTES = 1024 * 128;

export interface WorkbenchServerOptions {
  ai?: WorkbenchAIProviderOptions;
  settingsRoot?: string;
}

export function createWorkbenchServer(options: WorkbenchServerOptions = {}) {
  return createServer(async (request, response) => {
    try {
      await handleRequest(request, response, options);
    } catch (error) {
      const status = statusFromError(error);
      writeJson(response, status, {
        error: {
          message: error instanceof Error ? error.message : String(error),
        },
      } satisfies WorkbenchErrorResponse);
    }
  });
}

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
  options: WorkbenchServerOptions,
): Promise<void> {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  const segments = url.pathname.split("/").filter(Boolean);

  if (request.method === "OPTIONS") {
    writeCors(response);
    response.writeHead(204).end();
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/health") {
    writeJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/ai/settings") {
    writeJson(response, 200, {
      settings: await readAISettings(aiOptions(options)),
    });
    return;
  }

  if (request.method === "PUT" && url.pathname === "/api/ai/settings") {
    const body = await readJsonBody(request);
    writeJson(response, 200, {
      settings: await saveAISettings(
        body as WorkbenchAISettingsUpdate,
        aiOptions(options),
      ),
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/ai/test") {
    const body = await readJsonBody(request);
    writeJson(response, 200, {
      result: await testAIConnection(
        body as WorkbenchAISettingsUpdate,
        aiOptions(options),
      ),
    });
    return;
  }

  if (
    request.method === "GET" &&
    segments.length === 2 &&
    segments[0] === "api" &&
    segments[1] === "scenarios"
  ) {
    writeJson(response, 200, { scenarios: listScenarioSummaries() });
    return;
  }

  if (
    request.method === "GET" &&
    segments.length === 3 &&
    segments[0] === "api" &&
    segments[1] === "scenarios"
  ) {
    const scenario = getScenarioDetail(decodeURIComponent(segments[2]));
    if (!scenario) throw statusError(404, "Scenario not found.");
    writeJson(response, 200, { scenario });
    return;
  }

  if (
    request.method === "POST" &&
    segments.length === 4 &&
    segments[0] === "api" &&
    segments[1] === "scenarios" &&
    segments[3] === "inspect"
  ) {
    const body = await readJsonBody(request);
    const result = await inspectScenario(
      decodeURIComponent(segments[2]),
      body as WorkbenchInspectionRequest,
    );
    writeJson(response, 200, { result });
    return;
  }

  if (
    request.method === "POST" &&
    segments.length === 4 &&
    segments[0] === "api" &&
    segments[1] === "scenarios" &&
    segments[3] === "prompt-lab"
  ) {
    const body = await readJsonBody(request);
    const result = await runPromptLab(
      decodeURIComponent(segments[2]),
      body as WorkbenchPromptLabRequest,
      { aiOptions: aiOptions(options) },
    );
    writeJson(response, 200, { result });
    return;
  }

  if (
    request.method === "POST" &&
    segments.length === 4 &&
    segments[0] === "api" &&
    segments[1] === "scenarios" &&
    segments[3] === "drift-desk"
  ) {
    const body = await readJsonBody(request);
    const result = await runDriftDesk(
      decodeURIComponent(segments[2]),
      body as WorkbenchDriftDeskRequest,
      { aiReviewOptions: aiOptions(options) },
    );
    writeJson(response, 200, { result });
    return;
  }

  if (
    request.method === "POST" &&
    segments.length === 4 &&
    segments[0] === "api" &&
    segments[1] === "scenarios" &&
    segments[3] === "ai-loop"
  ) {
    const body = await readJsonBody(request);
    const result = await runAILoop(
      decodeURIComponent(segments[2]),
      body as WorkbenchAILoopRequest,
      { aiOptions: aiOptions(options) },
    );
    writeJson(response, 200, { result });
    return;
  }

  if (
    request.method === "GET" &&
    segments.length === 4 &&
    segments[0] === "api" &&
    segments[1] === "scenarios" &&
    segments[3] === "fingerprint-studio"
  ) {
    const result = await runFingerprintStudio(decodeURIComponent(segments[2]));
    writeJson(response, 200, { result });
    return;
  }

  throw statusError(404, "Endpoint not found.");
}

function aiOptions(
  options: WorkbenchServerOptions,
): WorkbenchAIProviderOptions & { root?: string } {
  return {
    ...(options.ai ?? {}),
    ...(options.settingsRoot ? { root: options.settingsRoot } : {}),
  };
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) {
      throw statusError(400, "Request body is too large.");
    }
    chunks.push(buffer);
  }

  const raw = Buffer.concat(chunks).toString("utf-8").trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw statusError(400, "Request body must be valid JSON.");
  }
}

function writeJson(
  response: ServerResponse,
  status: number,
  payload: unknown,
): void {
  writeCors(response);
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
  });
  response.end(`${JSON.stringify(payload, null, 2)}\n`);
}

function writeCors(response: ServerResponse): void {
  response.setHeader("access-control-allow-origin", "*");
  response.setHeader("access-control-allow-methods", "GET,POST,PUT,OPTIONS");
  response.setHeader("access-control-allow-headers", "content-type");
}

function statusFromError(error: unknown): number {
  return typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
    ? error.status
    : 500;
}

function statusError(
  status: number,
  message: string,
): Error & {
  status: number;
} {
  const error = new Error(message) as Error & { status: number };
  error.status = status;
  return error;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.GHOST_WORKBENCH_API_PORT ?? DEFAULT_PORT);
  createWorkbenchServer().listen(port, "127.0.0.1", () => {
    console.log(`Ghost Workbench API listening on http://127.0.0.1:${port}`);
  });
}
