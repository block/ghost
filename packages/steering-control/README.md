# steering-control

A before/after evaluation harness for Ghost fingerprints. It measures what
handing an agent a `.ghost` fingerprint buys — output quality, run-to-run
consistency, retrieval precision — as a ratio of the context tokens spent.

It produces one artifact: a self-contained `report.html` with screenshot
grids, variance bands, gather metrics, and a headline quality-vs-context
chart. Every number is deterministic — grep-able tells, selection-tape
diffs, CSS extraction. No LLM judges. Judgment stays with the human reading
the report.

## The arms

| Arm | Context the generating agent sees | Claim it tests |
| --- | --- | --- |
| `naked` | ballast + ask | baseline: median model output, no brand |
| `dump` | full fingerprint prose up front + ballast + ask | the naive "paste the brand guide in the system prompt" |
| `gather` | ballast + `ghost gather` menu + agent-selected `ghost pull`s near the ask | Ghost's actual loop |
| `dump-growth` | dump of this fingerprint **plus** extra corpora + ballast + ask | how dumping degrades as the corpus grows, while the gather menu grows one line per node |

Fresh context per run. The `naked` arm must never see the fingerprint.

## Setup

You need: Node 20+, the `ghost` CLI on PATH (or set `ghostBin` in config),
a `.ghost/` fingerprint package, and an agent that drives the loop (Claude
Code, goose, Cursor — anything that can read a prompt file and write HTML).

```bash
npx steering-control init        # writes eval.config.json + asks.md templates
```

Fill in `eval.config.json`:

```json
{
  "package": "./.ghost",
  "asks": "./asks.md",
  "ballast": "./ballast.md",
  "runsPerCell": 5,
  "arms": {
    "naked": true,
    "dump": true,
    "gather": true,
    "dump-growth": { "extraPackages": ["../other/.ghost"], "asks": [1] }
  },
  "tells": null,
  "out": "./out",
  "ghostBin": "ghost"
}
```

- `package` — the fingerprint under test.
- `asks` — a markdown file of numbered asks (see format below).
- `ballast` — fixed, realistic-shaped irrelevant context, identical across
  arms. It exists to create window pressure. Never edit it between runs.
- `tells` — path to a custom tells JSON, or `null` for the built-in
  model-median tells (measured defaults of unsteered generation).
- `dump-growth.extraPackages` — real corpora only. Label the point honestly;
  do not pad synthetically.

## Asks format

```markdown
## Ask 1 — billing settings page

Build a billing settings page for a SaaS product. ...

expect: foundation.tokens, primitive.control, primitive.stack
poison: pattern.email, pattern.editorial
```

- `expect:` — node ids a correct selection should include. Keep the set
  minimal and defensible: if reasonable people could argue about a node,
  leave it out. Contested nodes score as neutral.
- `poison:` — nodes whose selection is a retrieval failure (wrong register).
  "Pulled the email rules while building a settings page" is the headline
  retrieval metric.

## The loop

The harness assembles prompts and keeps books. **Your agent generates.**

Per cell (arm × ask), for k = 1..runsPerCell:

```bash
steering-control prompt <arm> <ask-n> --run <k>   # writes out/<arm>/ask-<n>/run-<k>.prompt.md
# → hand the prompt file to a FRESH agent context; it writes run-<k>.html
#   (gather arm: the agent runs `ghost pull` itself mid-task — that IS the test)
steering-control finish <arm> <ask-n> <k>         # slices the selection tape, records context sizes
```

Gather-arm runs are strictly serialized — the harness hard-fails if a run
is already open, because the selection tape is append-only and concurrent
runs corrupt attribution.

Then, zero LLM calls:

```bash
steering-control shoot     # screenshots every out/**/*.html via agent-browser (idempotent)
steering-control score     # out/metrics.json — distributions, consistency, retrieval
steering-control report    # out/report.html — self-contained, rebuildable from out/ alone
```

## What the report shows

- **Headline chart** — X: brand-context tokens (estimated, words x 1.33,
  labeled as such), Y: inverted median-tell score. One point per arm with a
  min-max variance band. The dump-growth point shows the scaling story.
- **Per-ask screenshot grids** — arms x runs. Variance you can see.
- **Range bands** — min / median / max tell score per cell. The claim is
  that steering collapses the spread, not just the mean.
- **Style consistency** — do the k runs agree on accent hue, radius, font
  stack? Fraction agreeing on the modal value, per dimension.
- **Gather metrics** (gather arm only, from the selection tape) — poison
  pulls (the legible number), precision/recall (secondary), selection
  stability across runs (mean pairwise Jaccard), pulled words per run.
- **Reproduction footer** — the exact commands to rebuild the report from
  `out/`, and the note that no LLM judged anything.

## Honest-claims checklist

- Report distributions, never single wins.
- The token axis is an estimate; the method note says so.
- If your ballast is small, claim "mid-conversation pressure," not "heavy
  context." Dilution claims need real window pressure (~80K+ tokens).
- Custom tells must be measured, not aesthetic opinions. The built-in set
  comes from 300 unsteered generations across three models.
- Commit `out/` (prompts, meta, metrics, report) so skeptics can rerun any
  arm and audit any number.
