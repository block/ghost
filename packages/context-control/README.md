# context-control

A local UI for testing the selection half of ghost's loop. steering-control
measures what a ghost package buys downstream of generation; context-control
measures whether the right guidance even makes it into context. Selection is
the unit. No generation, ever.

`ghost gather` does no filtering: the menu is always the whole catalog, and
selection happens in the model's head against each node's `description`.
So what this bench actually tests is whether descriptions are good enough
retrieval payloads — a node with a vague description is invisible at
selection time no matter how good its body is.

## Run

```bash
pnpm --filter @design-intelligence/ghost build   # bench shells the real CLI
tmp=$(mktemp -d)
node packages/ghost/dist/bin.js init --package "$tmp/.ghost"
node packages/context-control/cli.mjs \
  --package "$tmp/.ghost" \
  --asks packages/context-control/demo/asks.md
# → http://127.0.0.1:4114
```

Options: `--package <dir>` (default `./.ghost`), `--asks <file>`,
`--port <n>` (default 4114), `--ghost <bin>` (default: repo dist build,
else `ghost` on PATH).

## Screens

**package** — the catalog rendered as the selection surface the model
sees: id, kind, description, material count, coverage line. Click a node to
see its real `ghost pull` output in a drawer. Review descriptions as
retrieval payloads, not file contents; a node with no description is flagged
as invisible.

**bench** — type an ask (or run the whole asks suite), fire N single-shot
selection trials, and read the heatmap: nodes × asks, each cell the
fraction of trials that selected the node. Solid column = confident
description. Speckled = coin-flip. Empty row = dead node. Blue outline =
the ask's expected set. Scores above the map: consistency (mean pairwise
Jaccard), mean per-trial precision and recall, poison-selection rate, unknown
ids, and nodes ever selected.

Selection runs as a real agent would: the system prompt includes the cover
already in context and asks for a small pull from the menu. There is no
skill-less mode. One caveat remains: a live agent also
carries task context (open files, prior turns) that single-shot selection
lacks.

**replay** — the real `.ghost/.events` tape grouped into sessions: each
gather with its ask, the pulls that followed, re-gathers, and pull misses.
Ground truth from the field keeps the bench honest. Events stay local;
nothing leaves the machine.

## Asks format

Use the same ask blocks as steering-control. `expect:` lists nodes a good
selector should pull. `poison:` lists nodes whose condition does not apply.
`discount:` remains available to steering-control and is ignored here.

```markdown
## Ask 1 — notification settings

Build a dense settings screen for notification preferences.

expect: foundation.composition, foundation.controls, foundation.layout
poison: context.conversation
```

Asks without `expect:` still score consistency. Expected and poison sets add
precision, recall, and poison rate. List only selectable menu ids. Do not list
the manifest cover: gather has already placed it in context and removed it from
the menu.

## Model adapters

The contract is one function: `select({ ask, menu, cover, trial }) -> ids`. Two
adapters ship, selectable in the bench UI:

- `fake-lexical` — deterministic lexical-overlap stub with per-trial
  jitter near the decision boundary. No network, instant. Use it to
  exercise the UI loop and as a dumb-retrieval baseline.
- `openai-compatible` — a real LLM behind any OpenAI-compatible chat API.
  Configure `CONTEXT_CONTROL_BASE_URL`, `CONTEXT_CONTROL_API_KEY`, and
  `CONTEXT_CONTROL_MODEL` in an untracked `.env` or `.env.local` at the
  working directory. The CLI loads it on startup and makes this adapter the
  default when all three values are present. Trials run concurrently and
  sample at the endpoint's default temperature because trial-to-trial variance
  is the signal being measured.

Add providers to `MODEL_ADAPTERS` in `lib/model.mjs`.

## Layout

```text
cli.mjs          # context-control → serves the UI
lib/ghost.mjs    # shells ghost gather/pull --format json (never re-implements semantics)
lib/model.mjs    # model adapters (fake-lexical stub)
lib/bench.mjs    # trial runner + asks.md parser
lib/score.mjs    # jaccard, consistency, precision/recall, rates, coverage
lib/tape.mjs     # .ghost/.events parser + session grouping
lib/server.mjs   # node:http JSON endpoints + static UI
ui/index.html    # single-file UI, no build step
demo/asks.md     # demo suite against the default ghost init skeleton
```
