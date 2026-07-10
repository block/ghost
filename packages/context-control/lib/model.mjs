// Model adapters. The contract is one function:
//   select({ ask, menu, trial }) -> Promise<string[]>  (node ids)
//
// Two adapters ship:
//
// - fake-lexical: a deterministic lexical-overlap stub with per-trial
//   jitter near the decision boundary. No network, instant, and
//   deliberately imperfect — it produces the speckle pattern the heatmap
//   exists to expose. Use it to exercise the UI loop.
//
// - databricks: a real LLM behind a Databricks serving endpoint with an
//   OpenAI-compatible chat API. This is the model actually under test:
//   it sees the ask plus the menu (id, kind, description — exactly the
//   selection surface `ghost gather` emits) and returns node ids.
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "the",
  "for",
  "with",
  "of",
  "to",
  "in",
  "on",
  "is",
  "it",
  "that",
  "this",
  "we",
  "our",
  "as",
  "by",
  "or",
  "at",
]);

function tokens(text) {
  return (text ?? "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

/** Deterministic hash -> [0, 1). Stable across runs for the same inputs. */
function jitter(...parts) {
  let h = 2166136261;
  for (const ch of parts.join("\u0000")) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

export function fakeModel() {
  return {
    name: "fake-lexical",
    async select({ ask, menu, trial }) {
      const askTokens = new Set(tokens(ask));
      const selected = [];
      for (const entry of menu) {
        const nodeTokens = tokens(
          [entry.id.replaceAll(/[.-]/g, " "), entry.kind, entry.description]
            .filter(Boolean)
            .join(" "),
        );
        if (nodeTokens.length === 0) continue;
        let hits = 0;
        for (const t of nodeTokens) if (askTokens.has(t)) hits += 1;
        const score = hits / Math.sqrt(nodeTokens.length);
        const noise = (jitter(ask, entry.id, String(trial)) - 0.5) * 0.24;
        if (score + noise > 0.18) selected.push(entry.id);
      }
      return selected;
    },
  };
}

// The selection prompt is a replica of what a real skill-equipped agent
// follows: the skill bundle's recall and brief recipes
// (packages/ghost/src/skill-bundle/references/). The bench measures actual
// agent behavior, so the protocol those recipes install is always on —
// there is no skill-less arm. If the recipes change, change this with them.
const SELECT_SYSTEM = `You are an agent selecting brand-fingerprint nodes for a task,
following the ghost skill's recall recipe.

You will get an ask and the ghost gather menu: every node's id, kind, and
description. Ghost never selects for you; select against descriptions.

- Always include "index": it is the stance floor, read first every session.
- Pull a small set: 3-5 nodes is normal; 10 is a bad selection unless the
  task is unusually broad.
- Prefer nodes with concrete material for the surface being made.
- Anti-goal nodes are review-critical negative space; include one when the
  ask enters the territory its description names.

Respond with ONLY a JSON array of node id strings, nothing else.`;

function selectUser(ask, menu) {
  const lines = menu.map((entry) => {
    const flags = [entry.materials ? `${entry.materials} materials` : null]
      .filter(Boolean)
      .join(", ");
    return `- ${entry.id}${entry.kind ? ` [${entry.kind}]` : ""}${flags ? ` (${flags})` : ""}: ${entry.description ?? "(no description)"}`;
  });
  return `Ask: ${ask}\n\nMenu:\n${lines.join("\n")}`;
}

/** Parse a JSON id array out of a model reply, tolerating code fences. */
export function parseIdReply(text) {
  const match = String(text).match(/\[[\s\S]*?\]/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id) => typeof id === "string");
  } catch {
    return [];
  }
}

/**
 * Databricks serving-endpoint adapter (OpenAI-compatible chat API).
 * Auth comes from the `databricks` CLI's cached OAuth token; the host
 * comes from DATABRICKS_HOST. Nothing is stored.
 */
export function databricksModel({
  host = process.env.DATABRICKS_HOST,
  endpoint = process.env.CONTEXT_CONTROL_ENDPOINT ?? "goose",
} = {}) {
  if (!host) throw new Error("databricks model needs DATABRICKS_HOST");
  let tokenPromise = null;
  const getToken = () => {
    tokenPromise ??= execFileAsync("databricks", [
      "auth",
      "token",
      "--host",
      host,
    ]).then(({ stdout }) => JSON.parse(stdout).access_token);
    return tokenPromise;
  };
  return {
    name: `databricks:${endpoint}`,
    async select({ ask, menu }) {
      const token = await getToken();
      const res = await fetch(
        `${host}/serving-endpoints/${endpoint}/invocations`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${token}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            messages: [
              { role: "system", content: SELECT_SYSTEM },
              { role: "user", content: selectUser(ask, menu) },
            ],
            // Trial-to-trial variance is the signal being measured, so
            // sample at the endpoint's default temperature; do not pin 0.
            max_tokens: 1024,
          }),
        },
      );
      if (!res.ok) {
        throw new Error(
          `databricks ${endpoint}: ${res.status} ${await res.text()}`,
        );
      }
      const data = await res.json();
      return parseIdReply(data.choices?.[0]?.message?.content ?? "");
    },
  };
}

/** Registry keyed by name so the server/UI can offer a model picker. */
export function resolveModel(name = availableModels()[0]) {
  if (name === "fake-lexical") return fakeModel();
  if (name === "databricks" || name?.startsWith("databricks:")) {
    const endpoint = name.includes(":") ? name.split(":")[1] : undefined;
    return databricksModel(endpoint ? { endpoint } : {});
  }
  throw new Error(`unknown model: ${name}`);
}

/** First entry is the default. Databricks wins when a host is configured. */
export function availableModels() {
  return process.env.DATABRICKS_HOST
    ? ["databricks", "fake-lexical"]
    : ["fake-lexical"];
}
