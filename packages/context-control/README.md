# context-control

A local UI for testing the selection half of Ghost's loop. steering-control
measures what a fingerprint buys downstream of generation; context-control
measures whether the right truths even make it into context. Selection is
the unit. No generation, ever.

`ghost gather` does no filtering: the menu is always the whole catalog, and
selection happens in the model's head against each node's `description`.
So what this bench actually tests is whether descriptions are good enough
retrieval payloads — a truth with a vague description is invisible at
selection time no matter how good its body is.

## Run

```bash
pnpm --filter @design-intelligence/ghost build   # bench shells the real CLI
node packages/context-control/cli.mjs \
  --package packages/vessel-light/.ghost \
  --asks packages/context-control/demo/asks.md
# → http://127.0.0.1:4114
```

Options: `--package <dir>` (default `./.ghost`), `--asks <file>`,
`--port <n>` (default 4114), `--ghost <bin>` (default: repo dist build,
else `ghost` on PATH).

## Screens

**fingerprint** — the catalog rendered as the selection surface the model
sees: id, kind, description, material count, coverage line. Click a node to
see its real `ghost pull` output in a drawer. Review descriptions as
retrieval payloads, not file contents; a node with no description is flagged
as invisible.

**bench** — type an ask (or run the whole asks suite), fire N single-shot
selection trials, and read the heatmap: nodes × asks, each cell the
fraction of trials that selected the node. Solid column = confident
description. Speckled = coin-flip. Empty row = dead node. Blue outline =
the ask's expected set. Scores above the map: consistency (mean pairwise
Jaccard), precision/recall vs expected sets, and nodes-ever-selected.

Selection runs as a real agent would: the system prompt is a replica of
the ghost skill's recall and brief recipes (always include `index`, small
pulls). There is no skill-less mode — the bench
measures actual agent behavior. One caveat remains: a live agent also
carries task context (open files, prior turns) that single-shot selection
lacks.

**replay** — the real `.ghost/.events` tape grouped into sessions: each
gather with its ask, the pulls that followed, re-gathers, and pull misses.
Ground truth from the field keeps the bench honest. Events stay local;
nothing leaves the machine.

## Asks format

Numbered asks, each optionally followed by an `expect:` line of node ids:

```markdown
1. A dense settings screen for notification preferences
   expect: grammar.hierarchy, register.data-density
```

Unlabeled asks still score consistency; expected sets add precision and
recall.

## Model adapters

The contract is one function: `select({ ask, menu, trial }) -> ids`. Two
adapters ship, selectable in the bench UI:

- `fake-lexical` — deterministic lexical-overlap stub with per-trial
  jitter near the decision boundary. No network, instant. Use it to
  exercise the UI loop and as a dumb-retrieval baseline.
- `databricks` — a real LLM behind a Databricks serving endpoint with an
  OpenAI-compatible chat API. This is the default whenever
  `DATABRICKS_HOST` is set; put it in an untracked `.env` or `.env.local`
  at the working directory and the CLI loads it on startup. Auth comes
  from the `databricks` CLI's cached OAuth token; the endpoint from
  `CONTEXT_CONTROL_ENDPOINT` (default `goose`), or name it inline as
  `databricks:<endpoint>`. Trials run concurrently and sample at the
  endpoint's default temperature — trial-to-trial variance is the signal
  being measured, so it is not pinned to 0.

Add more providers in `lib/model.mjs` and register them in
`resolveModel`/`availableModels`.

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
demo/asks.md     # demo suite against packages/vessel-light/.ghost
```
