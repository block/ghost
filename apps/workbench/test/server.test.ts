import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildTraceLayout } from "../src/client/trace-layout";
import { createWorkbenchServer } from "../src/server";
import { runAILoop } from "../src/server/ai-loop";
import {
  generateText,
  type WorkbenchAIProviderOptions,
} from "../src/server/ai-provider";
import { reviewDriftWithAI } from "../src/server/ai-reviewer";
import { readAISettings, saveAISettings } from "../src/server/ai-settings";
import { runDriftDesk } from "../src/server/drift-desk";
import { runFingerprintStudio } from "../src/server/fingerprint-studio";
import { inspectScenario } from "../src/server/inspect";
import { runPromptLab } from "../src/server/prompt-lab";
import { scenarios } from "../src/server/scenarios";

let server: ReturnType<typeof createWorkbenchServer>;
let baseUrl: string;
let settingsRoot: string;
let fetchImpl: typeof fetch;
let fetchCalls: Array<{
  url: string;
  body: string;
  headers: HeadersInit | undefined;
}> = [];

beforeEach(async () => {
  settingsRoot = await mkdtemp(join(tmpdir(), "ghost-workbench-test-"));
  fetchCalls = [];
  fetchImpl = async (input, init) => {
    fetchCalls.push({
      url: String(input),
      body: typeof init?.body === "string" ? init.body : "",
      headers: init?.headers,
    });
    return openAIResponse("Ghost Workbench AI connection ok.");
  };
  server = createWorkbenchServer({
    settingsRoot,
    ai: {
      env: {},
      fetchImpl: (...args) => fetchImpl(...args),
    },
  });
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterEach(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await rm(settingsRoot, { force: true, recursive: true });
});

function openAIResponse(content: string, status = 200): Response {
  return new Response(
    JSON.stringify({
      choices: [{ message: { content } }],
      usage: {
        prompt_tokens: 11,
        completion_tokens: 7,
        total_tokens: 18,
      },
      ...(status >= 400 ? { error: { message: content } } : {}),
    }),
    { status, headers: { "content-type": "application/json" } },
  );
}

function anthropicResponse(content: string, status = 200): Response {
  return new Response(
    JSON.stringify({
      content: [{ type: "text", text: content }],
      usage: { input_tokens: 9, output_tokens: 5 },
      ...(status >= 400 ? { error: { message: content } } : {}),
    }),
    { status, headers: { "content-type": "application/json" } },
  );
}

function googleResponse(content: string, status = 200): Response {
  return new Response(
    JSON.stringify({
      candidates: [{ content: { parts: [{ text: content }] } }],
      usageMetadata: {
        promptTokenCount: 8,
        candidatesTokenCount: 6,
        totalTokenCount: 14,
      },
      ...(status >= 400 ? { error: { message: content } } : {}),
    }),
    { status, headers: { "content-type": "application/json" } },
  );
}

function queuedOpenAIFetch(contents: string[]): typeof fetch {
  const queue = [...contents];
  return async (input, init) => {
    fetchCalls.push({
      url: String(input),
      body: typeof init?.body === "string" ? init.body : "",
      headers: init?.headers,
    });
    return openAIResponse(queue.shift() ?? "ok");
  };
}

function configuredAIOptions(
  contents: string[] = ["Generated Workbench output."],
): WorkbenchAIProviderOptions {
  return {
    config: {
      provider: "openai-compatible",
      model: "ghost-workbench-test",
      baseUrl: "https://example.test/v1",
      apiKey: "test-key",
      apiKeyConfigured: true,
      timeoutMs: 5_000,
    },
    env: {},
    fetchImpl: queuedOpenAIFetch(contents),
  };
}

describe("workbench API", () => {
  it("lists scenarios", async () => {
    const response = await fetch(`${baseUrl}/api/scenarios`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.scenarios).toHaveLength(scenarios.length);
    expect(body.scenarios[0]).toHaveProperty("id");
  });

  it("inspects every scenario", async () => {
    for (const scenario of scenarios) {
      const response = await fetch(
        `${baseUrl}/api/scenarios/${scenario.id}/inspect`,
        {
          body: "{}",
          method: "POST",
        },
      );
      const body = await response.json();

      expect(response.status, scenario.id).toBe(200);
      expect(body.result.contexts.length, scenario.id).toBeGreaterThan(0);
      expect(body.result.contexts[0].markdown, scenario.id).toContain(
        "# Agent Handoff",
      );
    }
  });

  it("returns 404 json for unknown scenarios", async () => {
    const response = await fetch(`${baseUrl}/api/scenarios/nope/inspect`, {
      body: "{}",
      method: "POST",
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.message).toContain("Unknown scenario");
  });

  it("returns 400 json for malformed inspect requests", async () => {
    const response = await fetch(
      `${baseUrl}/api/scenarios/path-matched-single-surface/inspect`,
      {
        body: JSON.stringify({ targetPaths: "apps/refunds" }),
        method: "POST",
      },
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.message).toContain("targetPaths");
  });

  it("runs prompt lab for every scenario", async () => {
    for (const scenario of scenarios) {
      const response = await fetch(
        `${baseUrl}/api/scenarios/${scenario.id}/prompt-lab`,
        {
          body: JSON.stringify({
            promptSampleId: scenario.promptSamples[0]?.id,
          }),
          headers: { "content-type": "application/json" },
          method: "POST",
        },
      );
      const body = await response.json();

      expect(response.status, scenario.id).toBe(200);
      expect(body.result.handoffMarkdown, scenario.id).toContain(
        "# Ghost Prompt Lab Handoff",
      );
      expect(body.result.runner, scenario.id).toMatchObject({
        mode: "ai",
        state: "not_requested",
        provider: "none",
        generatedOutput: null,
      });
    }
  });

  it("returns 404 json for unknown prompt lab scenarios", async () => {
    const response = await fetch(`${baseUrl}/api/scenarios/nope/prompt-lab`, {
      body: "{}",
      method: "POST",
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.message).toContain("Unknown scenario");
  });

  it("returns 400 json for unknown prompt samples", async () => {
    const response = await fetch(
      `${baseUrl}/api/scenarios/path-matched-single-surface/prompt-lab`,
      {
        body: JSON.stringify({ promptSampleId: "missing" }),
        headers: { "content-type": "application/json" },
        method: "POST",
      },
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.message).toContain("Unknown prompt sample");
  });

  it("returns 400 json for malformed prompt lab requests", async () => {
    const response = await fetch(
      `${baseUrl}/api/scenarios/path-matched-single-surface/prompt-lab`,
      {
        body: JSON.stringify({ promptText: 42 }),
        headers: { "content-type": "application/json" },
        method: "POST",
      },
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.message).toContain("promptText");
  });

  it("caps prompt text length", async () => {
    const response = await fetch(
      `${baseUrl}/api/scenarios/path-matched-single-surface/prompt-lab`,
      {
        body: JSON.stringify({ promptText: "x".repeat(8_001) }),
        headers: { "content-type": "application/json" },
        method: "POST",
      },
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.message).toContain("promptText");
  });

  it("runs drift desk for every drift sample", async () => {
    for (const scenario of scenarios) {
      for (const sample of scenario.driftSamples) {
        const response = await fetch(
          `${baseUrl}/api/scenarios/${scenario.id}/drift-desk`,
          {
            body: JSON.stringify({ driftSampleId: sample.id }),
            headers: { "content-type": "application/json" },
            method: "POST",
          },
        );
        const body = await response.json();

        expect(response.status, `${scenario.id}/${sample.id}`).toBe(200);
        expect(body.result.reviewPacketMarkdown).toContain(
          "# Ghost Advisory Review",
        );
        expect(body.result.stance.state).toBe("preview-only");
      }
    }
  });

  it("returns 404 json for unknown drift desk scenarios", async () => {
    const response = await fetch(`${baseUrl}/api/scenarios/nope/drift-desk`, {
      body: "{}",
      method: "POST",
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.message).toContain("Unknown scenario");
  });

  it("returns 400 json for unknown drift samples", async () => {
    const response = await fetch(
      `${baseUrl}/api/scenarios/path-matched-single-surface/drift-desk`,
      {
        body: JSON.stringify({ driftSampleId: "missing" }),
        headers: { "content-type": "application/json" },
        method: "POST",
      },
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.message).toContain("Unknown drift sample");
  });

  it("returns 400 json for malformed drift desk requests", async () => {
    const response = await fetch(
      `${baseUrl}/api/scenarios/path-matched-single-surface/drift-desk`,
      {
        body: JSON.stringify({ includeAcceptedDecisions: "yes" }),
        headers: { "content-type": "application/json" },
        method: "POST",
      },
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.message).toContain("includeAcceptedDecisions");
  });

  it("caps drift diff length", async () => {
    const response = await fetch(
      `${baseUrl}/api/scenarios/path-matched-single-surface/drift-desk`,
      {
        body: JSON.stringify({ diffText: "x".repeat(100_001) }),
        headers: { "content-type": "application/json" },
        method: "POST",
      },
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.message).toContain("diffText");
  });

  it("loads fingerprint studio for every scenario", async () => {
    for (const scenario of scenarios) {
      const response = await fetch(
        `${baseUrl}/api/scenarios/${scenario.id}/fingerprint-studio`,
      );
      const body = await response.json();

      expect(response.status, scenario.id).toBe(200);
      expect(body.result.packages.length, scenario.id).toBe(
        scenario.sandbox === "single"
          ? 1
          : scenario.sandbox === "nested"
            ? 2
            : 3,
      );
      expect(body.result.packages[0].layers[0].path, scenario.id).toContain(
        "fingerprint/manifest.yml",
      );
    }
  });

  it("returns 404 json for unknown fingerprint studio scenarios", async () => {
    const response = await fetch(
      `${baseUrl}/api/scenarios/nope/fingerprint-studio`,
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.message).toContain("Unknown scenario");
  });

  it("reads unset AI settings as not configured", async () => {
    const response = await fetch(`${baseUrl}/api/ai/settings`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.settings).toMatchObject({
      state: "not_configured",
      provider: "openai-compatible",
      apiKeyConfigured: false,
    });
  });

  it("writes AI settings to env local without exposing secrets", async () => {
    const response = await fetch(`${baseUrl}/api/ai/settings`, {
      body: JSON.stringify({
        provider: "openai-compatible",
        model: "ghost-test-model",
        baseUrl: "https://example.test/v1",
        apiKey: "secret-workbench-key",
        timeoutMs: 15_000,
      }),
      headers: { "content-type": "application/json" },
      method: "PUT",
    });
    const body = await response.json();
    const envLocal = await readFile(join(settingsRoot, ".env.local"), "utf-8");

    expect(response.status).toBe(200);
    expect(body.settings).toMatchObject({
      state: "configured",
      model: "ghost-test-model",
      apiKeyConfigured: true,
    });
    expect(JSON.stringify(body)).not.toContain("secret-workbench-key");
    expect(envLocal).toContain(
      "GHOST_WORKBENCH_AI_API_KEY=secret-workbench-key",
    );
  });

  it("preserves an existing AI key when saving model settings", async () => {
    await saveAISettings(
      {
        provider: "openai-compatible",
        model: "first-model",
        baseUrl: "https://example.test/v1",
        apiKey: "secret-workbench-key",
      },
      { root: settingsRoot, env: {} },
    );

    await saveAISettings(
      {
        provider: "openai-compatible",
        model: "second-model",
        baseUrl: "https://example.test/v1",
      },
      { root: settingsRoot, env: {} },
    );
    const envLocal = await readFile(join(settingsRoot, ".env.local"), "utf-8");

    expect(envLocal).toContain(
      "GHOST_WORKBENCH_AI_API_KEY=secret-workbench-key",
    );
    expect((await readAISettings({ root: settingsRoot, env: {} })).model).toBe(
      "second-model",
    );
  });

  it("rejects invalid AI settings", async () => {
    for (const update of [
      { provider: "missing" },
      { model: "" },
      { baseUrl: "file:///tmp/key" },
      { apiKey: "x".repeat(4_001) },
      { timeoutMs: 999 },
    ]) {
      const response = await fetch(`${baseUrl}/api/ai/settings`, {
        body: JSON.stringify(update),
        headers: { "content-type": "application/json" },
        method: "PUT",
      });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.message).toBeTruthy();
    }
  });

  it("tests AI connection with mocked adapters", async () => {
    await saveAISettings(
      {
        provider: "openai-compatible",
        model: "ghost-test-model",
        baseUrl: "https://example.test/v1",
        apiKey: "secret-workbench-key",
      },
      { root: settingsRoot, env: {} },
    );

    const response = await fetch(`${baseUrl}/api/ai/test`, {
      body: "{}",
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.result).toMatchObject({
      state: "ok",
      provider: "openai-compatible",
      model: "ghost-test-model",
    });
    expect(fetchCalls[0].url).toBe("https://example.test/v1/chat/completions");
    expect(JSON.stringify(body)).not.toContain("secret-workbench-key");
  });

  it("returns AI connection errors without breaking settings", async () => {
    fetchImpl = async () => openAIResponse("provider unavailable", 500);
    const response = await fetch(`${baseUrl}/api/ai/test`, {
      body: JSON.stringify({
        provider: "openai-compatible",
        model: "ghost-test-model",
        baseUrl: "https://example.test/v1",
        apiKey: "secret-workbench-key",
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.result).toMatchObject({
      state: "error",
      provider: "openai-compatible",
    });
  });

  it("runs AI loop API for drift-backed virtual patches", async () => {
    const response = await fetch(
      `${baseUrl}/api/scenarios/path-matched-single-surface/ai-loop`,
      {
        body: JSON.stringify({
          promptSampleId: "refund-consequence-copy",
          driftSampleId: "refund-hardcoded-color",
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.result.virtualPatch.source).toBe("drift-sample");
    expect(body.result.checkReport.result).toBe("fail");
  });
});

describe("AI adapters", () => {
  it("calls OpenAI-compatible chat completions and parses text", async () => {
    const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
    const result = await generateText(
      { system: "System", user: "User", jsonMode: true },
      {
        config: {
          provider: "openai-compatible",
          model: "ghost-openai",
          baseUrl: "https://example.test/v1",
          apiKey: "key",
          apiKeyConfigured: true,
          timeoutMs: 5_000,
        },
        fetchImpl: async (input, init) => {
          calls.push({
            url: String(input),
            body: JSON.parse(String(init?.body)),
          });
          return openAIResponse('{"ok":true}');
        },
      },
    );

    expect(result).toMatchObject({
      state: "ok",
      provider: "openai-compatible",
      rawText: '{"ok":true}',
    });
    expect(calls[0].url).toBe("https://example.test/v1/chat/completions");
    expect(calls[0].body.response_format).toEqual({ type: "json_object" });
  });

  it("calls Anthropic messages and parses text", async () => {
    const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
    const result = await generateText(
      { system: "System", user: "User", jsonMode: true },
      {
        config: {
          provider: "anthropic",
          model: "ghost-anthropic",
          baseUrl: "https://api.anthropic.test/v1",
          apiKey: "key",
          apiKeyConfigured: true,
          timeoutMs: 5_000,
        },
        fetchImpl: async (input, init) => {
          calls.push({
            url: String(input),
            body: JSON.parse(String(init?.body)),
          });
          return anthropicResponse('{"ok":true}');
        },
      },
    );

    expect(result).toMatchObject({
      state: "ok",
      provider: "anthropic",
      rawText: '{"ok":true}',
    });
    expect(calls[0].url).toBe("https://api.anthropic.test/v1/messages");
    expect(String(calls[0].body.system)).toContain("Return valid JSON only");
  });

  it("calls Gemini generateContent and parses text", async () => {
    const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
    const result = await generateText(
      { system: "System", user: "User", jsonMode: true },
      {
        config: {
          provider: "google",
          model: "gemini-test",
          baseUrl: "https://generativelanguage.googleapis.test/v1beta",
          apiKey: "key",
          apiKeyConfigured: true,
          timeoutMs: 5_000,
        },
        fetchImpl: async (input, init) => {
          calls.push({
            url: String(input),
            body: JSON.parse(String(init?.body)),
          });
          return googleResponse('{"ok":true}');
        },
      },
    );

    expect(result).toMatchObject({
      state: "ok",
      provider: "google",
      rawText: '{"ok":true}',
    });
    expect(calls[0].url).toBe(
      "https://generativelanguage.googleapis.test/v1beta/models/gemini-test:generateContent?key=key",
    );
    expect(calls[0].body.generationConfig).toMatchObject({
      responseMimeType: "application/json",
    });
  });

  it("calls local OpenAI-compatible servers without requiring a key", async () => {
    const result = await generateText(
      { system: "System", user: "User" },
      {
        config: {
          provider: "local-openai-compatible",
          model: "local-model",
          baseUrl: "http://127.0.0.1:1234/v1",
          apiKeyConfigured: false,
          timeoutMs: 5_000,
        },
        fetchImpl: async () => openAIResponse("local ok"),
      },
    );

    expect(result).toMatchObject({
      state: "ok",
      provider: "local-openai-compatible",
      generatedOutput: "local ok",
    });
  });
});

describe("scenario assertions", () => {
  it("path-matched scenario selects refund settings context", async () => {
    const result = await inspectScenario("path-matched-single-surface");
    const entrypoint = result.contexts[0].entrypoint;

    expect(entrypoint.match.status).toBe("path-match");
    expect(entrypoint.match.matchedScopes).toContain("refund-settings");
    expect(entrypoint.selected.prose.map((node) => node.ref)).toContain(
      "prose.principle:refund-trust",
    );
    expect(entrypoint.omissions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Exemplars", omitted: 2 }),
      ]),
    );
  });

  it("global fallback remains broad and provisional", async () => {
    const result = await inspectScenario("global-fallback");
    const entrypoint = result.contexts[0].entrypoint;

    expect(entrypoint.match.status).toBe("global-fallback");
    expect(entrypoint.match.reasons.join("\n")).toContain(
      "No fingerprint scope matched",
    );
  });

  it("nested stack preserves child-specific refs", async () => {
    const result = await inspectScenario("nested-stack");
    const entrypoint = result.contexts[0].entrypoint;

    expect(entrypoint.match.sourceLayers.join("\n")).toContain(
      "apps/dashboard/.ghost",
    );
    expect(entrypoint.selected.prose.map((node) => node.ref)).toContain(
      "prose.principle:dashboard-refund-focus",
    );
  });

  it("shared component review stays broad", async () => {
    const result = await inspectScenario("shared-component-review");
    const entrypoint = result.contexts[0].entrypoint;

    expect(entrypoint.match.status).toBe("global-fallback");
    expect(entrypoint.match.matchedScopes).not.toContain("refund-settings");
    expect(result.checkReport?.changed_files).toContain("shared/ui/Button.tsx");
  });

  it("multi-stack diff returns multiple contexts", async () => {
    const result = await inspectScenario("multi-stack-diff");

    expect(result.contexts).toHaveLength(2);
    expect(
      result.contexts.flatMap((context) =>
        context.entrypoint.selected.prose.map((node) => node.ref),
      ),
    ).toEqual(
      expect.arrayContaining([
        "prose.principle:dashboard-refund-focus",
        "prose.principle:portal-payment-clarity",
      ]),
    );
  });

  it("malformed cache stays non-canonical", async () => {
    const result = await inspectScenario("malformed-cache");
    const cache = result.contexts[0].entrypoint.generatedCache;

    expect(cache.state).toBe("unreadable");
    expect(result.contexts[0].markdown).toContain(
      "Generated cache is optional source material",
    );
  });

  it("deterministic emission repeats exactly", async () => {
    const result = await inspectScenario("deterministic-emission");

    expect(result.deterministic).toEqual({ repeated: true, equal: true });
  });

  it("builds a path-matched trace from target to handoff", async () => {
    const result = await inspectScenario("path-matched-single-surface");
    const trace = result.contexts[0].trace;

    expect(trace.nodes.map((node) => node.kind)).toEqual(
      expect.arrayContaining([
        "input",
        "changed-file",
        "package",
        "scope",
        "prose",
        "composition",
        "exemplar",
        "check",
        "handoff",
        "omission",
      ]),
    );
    expect(trace.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "scope",
          title: "refund-settings",
          state: "selected",
        }),
        expect.objectContaining({
          kind: "prose",
          ref: "prose.principle:refund-trust",
          state: "selected",
        }),
      ]),
    );
    expect(trace.edges.map((edge) => edge.state)).toEqual(
      expect.arrayContaining(["matched", "selected", "omitted"]),
    );
  });

  it("marks global fallback traces as provisional", async () => {
    const result = await inspectScenario("global-fallback");
    const trace = result.contexts[0].trace;
    const fallbackNode = trace.nodes.find((node) => node.state === "fallback");

    expect(fallbackNode).toMatchObject({
      kind: "scope",
      title: "Global fallback",
    });
    expect(trace.defaultSelectedNodeId).toBe(fallbackNode?.id);
    expect(trace.summary).toContain("broader fallback");
  });

  it("returns one trace per routed multi-stack context", async () => {
    const result = await inspectScenario("multi-stack-diff");

    expect(result.contexts).toHaveLength(2);
    expect(result.contexts.map((context) => context.trace.id)).toEqual([
      "context-1",
      "context-2",
    ]);
    expect(
      result.contexts.every((context) =>
        context.trace.nodes.some((node) => node.kind === "handoff"),
      ),
    ).toBe(true);
  });

  it("removes temporary sandboxes after inspection", async () => {
    let sandboxRoot = "";
    await inspectScenario(
      "path-matched-single-surface",
      {},
      {
        onSandboxCreated: (root) => {
          sandboxRoot = root;
        },
      },
    );

    await expect(access(sandboxRoot)).rejects.toThrow();
  });

  it("prompt lab narrows refund prompts to refund settings refs", async () => {
    const result = await runPromptLab("path-matched-single-surface", {
      promptText:
        "Tighten refund settings consequence copy and recovery before save.",
    });
    const entrypoint = result.inspection.contexts[0].entrypoint;

    expect(result.interpretation.status).toBe("text-match");
    expect(result.interpretation.selectedSampleId).toBe(
      "refund-consequence-copy",
    );
    expect(entrypoint.match.status).toBe("path-match");
    expect(entrypoint.selected.prose.map((node) => node.ref)).toContain(
      "prose.principle:refund-trust",
    );
  });

  it("prompt lab prepends prompt interpretation to the trace", async () => {
    const result = await runPromptLab("path-matched-single-surface", {
      promptSampleId: "refund-consequence-copy",
    });
    const trace = result.inspection.contexts[0].trace;

    expect(trace.nodes[0]).toMatchObject({
      kind: "input",
      title: "Prompt interpretation",
      state: "selected",
    });
    expect(trace.edges[0]).toMatchObject({
      from: trace.nodes[0].id,
      state: "matched",
      label: "interpreted target",
    });
  });

  it("prompt lab keeps shared component prompts broad", async () => {
    const result = await runPromptLab("path-matched-single-surface", {
      promptSampleId: "shared-button-polish",
    });
    const entrypoint = result.inspection.contexts[0].entrypoint;

    expect(entrypoint.match.status).toBe("global-fallback");
    expect(entrypoint.match.matchedScopes).not.toContain("refund-settings");
    expect(result.interpretation.expectedFocusRefs).toEqual([]);
  });

  it("prompt lab preserves nested child refs", async () => {
    const result = await runPromptLab("nested-stack", {
      promptSampleId: "dashboard-refund-review",
    });
    const entrypoint = result.inspection.contexts[0].entrypoint;

    expect(entrypoint.match.sourceLayers.join("\n")).toContain(
      "apps/dashboard/.ghost",
    );
    expect(entrypoint.selected.prose.map((node) => node.ref)).toContain(
      "prose.principle:dashboard-refund-focus",
    );
  });

  it("prompt lab returns multiple contexts for multi-stack prompts", async () => {
    const result = await runPromptLab("multi-stack-diff", {
      promptSampleId: "two-surface-review",
    });

    expect(result.inspection.contexts).toHaveLength(2);
    expect(result.handoffMarkdown).toContain("Context 1:");
    expect(result.handoffMarkdown).toContain("Context 2:");
  });

  it("prompt lab keeps malformed cache non-canonical", async () => {
    const result = await runPromptLab("malformed-cache", {
      promptSampleId: "cache-resistant-refund-work",
    });
    const cache = result.inspection.contexts[0].entrypoint.generatedCache;

    expect(cache.state).toBe("unreadable");
    expect(result.handoffMarkdown).toContain(
      "Generated cache is optional source material",
    );
  });

  it("prompt lab repeated emission is deterministic", async () => {
    const first = await runPromptLab("deterministic-emission", {
      promptSampleId: "repeatable-refund-handoff",
    });
    const second = await runPromptLab("deterministic-emission", {
      promptSampleId: "repeatable-refund-handoff",
    });

    expect(first.handoffMarkdown).toBe(second.handoffMarkdown);
    expect(first.inspection.deterministic).toEqual({
      repeated: true,
      equal: true,
    });
  });

  it("prompt lab runner is not requested by default", async () => {
    const result = await runPromptLab("path-matched-single-surface", {
      promptSampleId: "refund-consequence-copy",
    });

    expect(result.runner).toEqual({
      mode: "ai",
      state: "not_requested",
      provider: "none",
      message: expect.stringContaining("deterministic handoff preview"),
      generatedOutput: null,
    });
  });

  it("drift review appends review signals and blocking check nodes", async () => {
    const result = await runDriftDesk("path-matched-single-surface", {
      driftSampleId: "refund-hardcoded-color",
    });
    const trace = result.contexts[0].trace;

    expect(trace.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "review-signal",
          state: "blocking",
        }),
        expect.objectContaining({
          kind: "check",
          ref: "check:no-hardcoded-ui-color",
          state: "blocking",
        }),
      ]),
    );
    expect(trace.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          state: "blocking",
          label: "failed check",
        }),
      ]),
    );
  });

  it("trace layout preserves stable lane and node ordering", async () => {
    const result = await inspectScenario("path-matched-single-surface");
    const trace = result.contexts[0].trace;
    const layout = buildTraceLayout(trace);

    expect(layout.lanes.map((lane) => lane.id)).toEqual([
      "input",
      "files",
      "package",
      "scope",
      "refs",
      "omissions",
      "handoff",
    ]);
    expect(layout.positions.get(trace.defaultSelectedNodeId)?.x).toBe(
      layout.lanePositions.get("scope")?.x,
    );
    expect(
      trace.nodes
        .filter((node) => node.kind === "omission")
        .every((node) => node.state === "omitted"),
    ).toBe(true);
  });

  it("prompt lab generation returns output for every prompt sample with a mocked provider", async () => {
    for (const scenario of scenarios) {
      for (const sample of scenario.promptSamples) {
        const result = await runPromptLab(
          scenario.id,
          { promptSampleId: sample.id, runAI: true },
          {
            aiOptions: configuredAIOptions([
              `Generated implementation for ${sample.id}.`,
            ]),
          },
        );

        expect(result.runner).toMatchObject({
          state: "ok",
          provider: "openai-compatible",
          generatedOutput: `Generated implementation for ${sample.id}.`,
        });
      }
    }
  });

  it("AI loop returns patch, checks, packet, AI findings, and stance", async () => {
    const result = await runAILoop(
      "path-matched-single-surface",
      {
        promptSampleId: "refund-consequence-copy",
        driftSampleId: "refund-hardcoded-color",
      },
      {
        aiOptions: configuredAIOptions([
          "Generated refund implementation.",
          JSON.stringify({ findings: [] }),
        ]),
      },
    );

    expect(result.virtualPatch).toMatchObject({ source: "drift-sample" });
    expect(result.checkReport?.result).toBe("fail");
    expect(result.reviewPacketMarkdown).toContain("# Ghost Advisory Review");
    expect(result.aiReview?.state).toBe("ok");
    expect(result.stance?.state).toBe("preview-only");
  });

  it("AI loop parses AI virtual patch JSON when no drift sample is supplied", async () => {
    const result = await runAILoop(
      "path-matched-single-surface",
      { promptSampleId: "refund-consequence-copy" },
      {
        aiOptions: configuredAIOptions([
          "Generated refund implementation.",
          JSON.stringify({
            files: [
              {
                path: "apps/refunds/settings/page.tsx",
                content:
                  "export function RefundSettings(){ return <div style={{ color: 'color.intent.warning' }}>Safe</div>; }",
                summary: "Uses semantic warning token.",
              },
            ],
            notes: ["Virtual patch only."],
          }),
          JSON.stringify({ findings: [] }),
        ]),
      },
    );

    expect(result.virtualPatch).toMatchObject({ source: "ai" });
    expect(result.virtualPatch?.diffText).toContain(
      "apps/refunds/settings/page.tsx",
    );
    expect(result.checkReport?.result).toBe("pass");
  });

  it("AI loop hardcoded refund color virtual patch fails deterministic checks", async () => {
    const result = await runAILoop(
      "path-matched-single-surface",
      {
        promptSampleId: "refund-consequence-copy",
        driftSampleId: "refund-hardcoded-color",
      },
      {
        aiOptions: configuredAIOptions([
          "Generated refund implementation.",
          JSON.stringify({ findings: [] }),
        ]),
      },
    );

    expect(result.checkReport?.result).toBe("fail");
    expect(
      result.checkReport?.findings.map((finding) => finding.check_id),
    ).toContain("no-hardcoded-ui-color");
  });

  it("AI loop semantic-token virtual patch passes active checks", async () => {
    const result = await runAILoop(
      "path-matched-single-surface",
      {
        promptSampleId: "refund-consequence-copy",
        driftSampleId: "refund-semantic-token-pass",
      },
      {
        aiOptions: configuredAIOptions([
          "Generated refund implementation.",
          JSON.stringify({ findings: [] }),
        ]),
      },
    );

    expect(result.checkReport?.result).toBe("pass");
    expect(result.checkReport?.findings).toEqual([]);
  });

  it("AI loop multi-stack sample returns multiple contexts", async () => {
    const result = await runAILoop(
      "multi-stack-diff",
      {
        promptSampleId: "two-surface-review",
        driftSampleId: "two-stack-advisory-review",
      },
      {
        aiOptions: configuredAIOptions([
          "Generated multi-stack implementation.",
          JSON.stringify({ findings: [] }),
        ]),
      },
    );

    expect(result.contexts).toHaveLength(2);
    expect((result.reviewPacket as { stacks?: unknown[] }).stacks).toHaveLength(
      2,
    );
  });

  it("AI loop malformed cache stays visible and non-canonical", async () => {
    const result = await runAILoop(
      "malformed-cache",
      {
        promptSampleId: "cache-resistant-refund-work",
        driftSampleId: "cache-caveat-refund-review",
      },
      {
        aiOptions: configuredAIOptions([
          "Generated cache-safe implementation.",
          JSON.stringify({ findings: [] }),
        ]),
      },
    );

    expect(result.contexts[0].entrypoint.generatedCache.state).toBe(
      "unreadable",
    );
    expect(result.reviewPacketMarkdown).toContain(
      "Generated cache is optional source material",
    );
  });

  it("removes temporary sandboxes after AI loop success", async () => {
    let sandboxRoot = "";
    await runAILoop(
      "path-matched-single-surface",
      {
        promptSampleId: "refund-consequence-copy",
        driftSampleId: "refund-hardcoded-color",
      },
      {
        aiOptions: configuredAIOptions([
          "Generated refund implementation.",
          JSON.stringify({ findings: [] }),
        ]),
        onSandboxCreated: (root) => {
          sandboxRoot = root;
        },
      },
    );

    await expect(access(sandboxRoot)).rejects.toThrow();
  });

  it("removes temporary sandboxes after AI loop failure", async () => {
    let sandboxRoot = "";

    await expect(
      runAILoop(
        "path-matched-single-surface",
        {
          promptSampleId: "refund-consequence-copy",
          driftSampleId: "refund-hardcoded-color",
        },
        {
          aiOptions: configuredAIOptions([
            "Generated refund implementation.",
            JSON.stringify({ findings: [] }),
          ]),
          onSandboxCreated: (root) => {
            sandboxRoot = root;
            throw new Error("boom");
          },
        },
      ),
    ).rejects.toThrow("boom");

    await expect(access(sandboxRoot)).rejects.toThrow();
  });

  it("removes temporary sandboxes after prompt lab success", async () => {
    let sandboxRoot = "";
    await runPromptLab(
      "path-matched-single-surface",
      { promptSampleId: "refund-consequence-copy" },
      {
        onSandboxCreated: (root) => {
          sandboxRoot = root;
        },
      },
    );

    await expect(access(sandboxRoot)).rejects.toThrow();
  });

  it("removes temporary sandboxes after prompt lab failure", async () => {
    let sandboxRoot = "";

    await expect(
      runPromptLab(
        "path-matched-single-surface",
        { promptSampleId: "refund-consequence-copy" },
        {
          onSandboxCreated: (root) => {
            sandboxRoot = root;
            throw new Error("boom");
          },
        },
      ),
    ).rejects.toThrow("boom");

    await expect(access(sandboxRoot)).rejects.toThrow();
  });

  it("drift desk flags refund hardcoded color failures", async () => {
    const result = await runDriftDesk("path-matched-single-surface", {
      driftSampleId: "refund-hardcoded-color",
    });

    expect(result.checkReport.result).toBe("fail");
    expect(
      result.checkReport.findings.map((finding) => finding.check_id),
    ).toContain("no-hardcoded-ui-color");
    expect(result.stance.recommendation).toBe("repair-required");
  });

  it("drift desk keeps shared component drift advisory-only", async () => {
    const result = await runDriftDesk("shared-component-review", {
      driftSampleId: "shared-button-advisory",
    });

    expect(result.checkReport.result).toBe("pass");
    expect(result.contexts[0].entrypoint.match.status).toBe("global-fallback");
    expect(result.aiReview.state).toBe("not_configured");
  });

  it("drift desk returns multiple contexts and packet stacks for multi-stack samples", async () => {
    const result = await runDriftDesk("multi-stack-diff", {
      driftSampleId: "two-stack-advisory-review",
    });
    const packet = result.reviewPacket as { stacks?: unknown[] };

    expect(result.contexts).toHaveLength(2);
    expect(packet.stacks).toHaveLength(2);
  });

  it("drift desk pass sample has no active failures", async () => {
    const result = await runDriftDesk("path-matched-single-surface", {
      driftSampleId: "refund-semantic-token-pass",
    });

    expect(result.checkReport.result).toBe("pass");
    expect(result.checkReport.findings).toEqual([]);
  });

  it("drift desk malformed cache stays non-canonical", async () => {
    const result = await runDriftDesk("malformed-cache", {
      driftSampleId: "cache-caveat-refund-review",
    });

    expect(result.contexts[0].entrypoint.generatedCache.state).toBe(
      "unreadable",
    );
    expect(result.reviewPacketMarkdown).toContain(
      "Generated cache is optional source material",
    );
  });

  it("drift desk returns not_configured when AI env is missing", async () => {
    const result = await runDriftDesk(
      "path-matched-single-surface",
      { driftSampleId: "refund-hardcoded-color" },
      { aiReviewOptions: { root: settingsRoot, env: {} } },
    );

    expect(result.aiReview).toMatchObject({
      state: "not_configured",
      provider: "none",
      findings: [],
    });
  });

  it("drift desk parses mocked AI advisory findings", async () => {
    const result = await runDriftDesk(
      "path-matched-single-surface",
      { driftSampleId: "refund-hardcoded-color" },
      {
        aiReviewOptions: {
          env: {
            GHOST_WORKBENCH_AI_PROVIDER: "openai-compatible",
            GHOST_WORKBENCH_AI_BASE_URL: "https://example.test/v1",
            GHOST_WORKBENCH_AI_API_KEY: "test",
            GHOST_WORKBENCH_AI_MODEL: "ghost-reviewer",
          },
          fetchImpl: async () =>
            new Response(
              JSON.stringify({
                choices: [
                  {
                    message: {
                      content: JSON.stringify({
                        findings: [
                          {
                            category: "fix",
                            severity: "serious",
                            title: "Use the semantic warning token",
                            path: "apps/refunds/settings/page.tsx",
                            line: 1,
                            message:
                              "The diff uses a hardcoded warning color where the fingerprint expects semantic tokens.",
                            evidence: ["check:no-hardcoded-ui-color"],
                            repair:
                              "Replace the hex value with color.intent.warning.",
                          },
                        ],
                      }),
                    },
                  },
                ],
              }),
            ),
        },
      },
    );

    expect(result.aiReview.state).toBe("ok");
    expect(result.aiReview.findings[0]).toMatchObject({
      category: "fix",
      title: "Use the semantic warning token",
    });
    expect(result.stance.advisorySignals).toBe(1);
  });

  it("invalid AI JSON returns an AI error state", async () => {
    const review = await reviewDriftWithAI(
      {
        scenarioTitle: "Scenario",
        sampleTitle: "Sample",
        reviewPacketMarkdown: "# Packet",
        checkReport: {
          schema: "ghost.check-report/v1",
          result: "pass",
          package_dir: ".ghost",
          changed_files: [],
          routed_files: [],
          findings: [],
        },
      },
      {
        env: {
          GHOST_WORKBENCH_AI_PROVIDER: "openai-compatible",
          GHOST_WORKBENCH_AI_BASE_URL: "https://example.test/v1",
          GHOST_WORKBENCH_AI_API_KEY: "test",
          GHOST_WORKBENCH_AI_MODEL: "ghost-reviewer",
        },
        fetchImpl: async () =>
          new Response(
            JSON.stringify({
              choices: [{ message: { content: "not json" } }],
            }),
          ),
      },
    );

    expect(review).toMatchObject({
      state: "error",
      provider: "openai-compatible",
      findings: [],
      rawText: "not json",
    });
  });

  it("drift desk stance preview never writes sync state", async () => {
    let sandboxRoot = "";
    await runDriftDesk(
      "path-matched-single-surface",
      { driftSampleId: "refund-hardcoded-color" },
      {
        onSandboxCreated: (root) => {
          sandboxRoot = root;
        },
        aiReviewer: async () => {
          await expect(
            access(join(sandboxRoot, ".ghost-sync.json")),
          ).rejects.toThrow();
          return {
            state: "not_configured",
            provider: "none",
            message: "not configured",
            findings: [],
          };
        },
      },
    );
  });

  it("fingerprint studio exposes refund layer refs and active checks", async () => {
    const result = await runFingerprintStudio("path-matched-single-surface");
    const refs = result.packages.flatMap((pkg) =>
      pkg.refs.map((ref) => ref.ref),
    );

    expect(refs).toEqual(
      expect.arrayContaining([
        "prose.principle:refund-trust",
        "inventory.exemplar:refund-settings-primary",
        "composition.pattern:refund-disclosure",
        "check:no-hardcoded-ui-color",
      ]),
    );
    expect(result.packages[0].counts.activeChecks).toBe(1);
    expect(result.packages[0].health.status).not.toBe("error");
  });

  it("fingerprint studio shows package refs for fallback scenarios", async () => {
    const result = await runFingerprintStudio("global-fallback");

    expect(result.stackPreviews[0].targetPaths).toEqual([
      "apps/payroll/page.tsx",
    ]);
    expect(result.packages[0].refs.map((ref) => ref.ref)).toContain(
      "prose.principle:refund-trust",
    );
  });

  it("fingerprint studio shows nested package provenance", async () => {
    const result = await runFingerprintStudio("nested-stack");

    expect(result.packages.map((pkg) => pkg.packageDir)).toEqual([
      ".ghost",
      "apps/dashboard/.ghost",
    ]);
    expect(result.stackPreviews[0].packageDirs).toEqual([
      ".ghost",
      "apps/dashboard/.ghost",
    ]);
    expect(result.stackPreviews[0].mergedRefs.prose).toContain(
      "prose.principle:dashboard-refund-focus",
    );
  });

  it("fingerprint studio returns distinct multi-stack previews", async () => {
    const result = await runFingerprintStudio("multi-stack-diff");

    expect(result.packages.map((pkg) => pkg.packageDir)).toEqual([
      ".ghost",
      "apps/dashboard/.ghost",
      "apps/portal/.ghost",
    ]);
    expect(result.stackPreviews).toHaveLength(2);
    expect(result.stackPreviews.map((stack) => stack.localPackageDir)).toEqual([
      "apps/dashboard/.ghost",
      "apps/portal/.ghost",
    ]);
  });

  it("fingerprint studio keeps malformed cache non-canonical", async () => {
    const result = await runFingerprintStudio("malformed-cache");

    expect(result.packages[0].health.status).not.toBe("error");
    expect(result.packages[0].inventory).toMatchObject({
      state: "unreadable",
      path: ".ghost/fingerprint/sources/cache/inventory.json",
    });
  });

  it("fingerprint studio output is deterministic", async () => {
    const first = await runFingerprintStudio("deterministic-emission");
    const second = await runFingerprintStudio("deterministic-emission");

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it("removes temporary sandboxes after fingerprint studio success", async () => {
    let sandboxRoot = "";
    await runFingerprintStudio("path-matched-single-surface", {
      onSandboxCreated: (root) => {
        sandboxRoot = root;
      },
    });

    await expect(access(sandboxRoot)).rejects.toThrow();
  });

  it("removes temporary sandboxes after fingerprint studio failure", async () => {
    let sandboxRoot = "";

    await expect(
      runFingerprintStudio("path-matched-single-surface", {
        onSandboxCreated: (root) => {
          sandboxRoot = root;
          throw new Error("boom");
        },
      }),
    ).rejects.toThrow("boom");

    await expect(access(sandboxRoot)).rejects.toThrow();
  });

  it("removes temporary sandboxes after drift desk success", async () => {
    let sandboxRoot = "";
    await runDriftDesk(
      "path-matched-single-surface",
      { driftSampleId: "refund-hardcoded-color" },
      {
        onSandboxCreated: (root) => {
          sandboxRoot = root;
        },
      },
    );

    await expect(access(sandboxRoot)).rejects.toThrow();
  });

  it("removes temporary sandboxes after drift desk failure", async () => {
    let sandboxRoot = "";

    await expect(
      runDriftDesk(
        "path-matched-single-surface",
        { driftSampleId: "refund-hardcoded-color" },
        {
          onSandboxCreated: (root) => {
            sandboxRoot = root;
            throw new Error("boom");
          },
        },
      ),
    ).rejects.toThrow("boom");

    await expect(access(sandboxRoot)).rejects.toThrow();
  });
});
