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
// - openai-compatible: a real LLM behind an OpenAI-compatible chat API.
//   It sees the ask plus the menu (id, kind, description — exactly the
//   selection surface `ghost gather` emits) and returns node ids.

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
const SELECT_SYSTEM = `You are an agent selecting brand guidance nodes for a task,
following the ghost skill's recall recipe.

You will get an ask, the cover already in context, and the ghost gather menu.
Select only menu node ids against their descriptions. Do not select the cover.

- Pull every node whose description indicates its stated situation applies and
  whose guidance, material, structure, or refusal governs the work.
- Skip inapplicable nodes. Topic overlap alone is not applicability.
- Do not add nodes for completeness or omit applicable nodes to meet a count.
- Anti-goal nodes are review-critical negative space; pull each one whose
  description names territory the ask enters.

Respond with ONLY a JSON array of node id strings, nothing else.`;

function selectUser(ask, menu, cover) {
  const lines = menu.map((entry) => {
    const flags = [entry.materials ? `${entry.materials} materials` : null]
      .filter(Boolean)
      .join(", ");
    return `- ${entry.id}${entry.kind ? ` [${entry.kind}]` : ""}${flags ? ` (${flags})` : ""}: ${entry.description ?? "(no description)"}`;
  });
  const coverLine = cover
    ? `Cover already in context: ${cover.id}\n\n${cover.body}\n\n`
    : "";
  return `${coverLine}Ask: ${ask}\n\nMenu:\n${lines.join("\n")}`;
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

/** OpenAI-compatible chat adapter configured entirely through public env vars. */
export function openAICompatibleModel({
  baseUrl = process.env.CONTEXT_CONTROL_BASE_URL,
  apiKey = process.env.CONTEXT_CONTROL_API_KEY,
  model = process.env.CONTEXT_CONTROL_MODEL,
} = {}) {
  if (!baseUrl) {
    throw new Error("openai-compatible model needs CONTEXT_CONTROL_BASE_URL");
  }
  if (!apiKey) {
    throw new Error("openai-compatible model needs CONTEXT_CONTROL_API_KEY");
  }
  if (!model) {
    throw new Error("openai-compatible model needs CONTEXT_CONTROL_MODEL");
  }
  return {
    name: "openai-compatible",
    async select({ ask, menu, cover }) {
      const res = await fetch(
        `${baseUrl.replace(/\/$/, "")}/chat/completions`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${apiKey}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: SELECT_SYSTEM },
              { role: "user", content: selectUser(ask, menu, cover) },
            ],
            // Trial-to-trial variance is the signal being measured, so sample at
            // the endpoint's default temperature rather than pinning it to zero.
            max_tokens: 1024,
          }),
        },
      );
      if (!res.ok) {
        throw new Error(
          `openai-compatible model: ${res.status} ${await res.text()}`,
        );
      }
      const data = await res.json();
      return parseIdReply(data.choices?.[0]?.message?.content ?? "");
    },
  };
}

const MODEL_ADAPTERS = {
  "openai-compatible": {
    available: () =>
      Boolean(
        process.env.CONTEXT_CONTROL_BASE_URL &&
          process.env.CONTEXT_CONTROL_API_KEY &&
          process.env.CONTEXT_CONTROL_MODEL,
      ),
    create: () => openAICompatibleModel(),
  },
  "fake-lexical": {
    available: () => true,
    create: () => fakeModel(),
  },
};

/** Resolve a model name exposed by availableModels. */
export function resolveModel(name = availableModels()[0]) {
  const adapter = MODEL_ADAPTERS[name];
  if (!adapter) throw new Error(`unknown model: ${name}`);
  return adapter.create();
}

/** Available adapter names in default order. */
export function availableModels() {
  return Object.entries(MODEL_ADAPTERS)
    .filter(([, adapter]) => adapter.available())
    .map(([name]) => name);
}
