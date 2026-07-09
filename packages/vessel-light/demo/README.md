# vessel-light steering demo

An A/B/C comparison showing why `ghost gather` (just-in-time selection) beats
context-dumping — especially under production context pressure.

## Arms

| Arm | Context | Claim it tests |
| --- | --- | --- |
| **A — naked** | ballast + ask | baseline: median model output, no brand |
| **B — dump** | fingerprint dump (front) + ballast + ask | the naive integration: "paste the brand guide in the system prompt" |
| **C — gather** | ballast + gather menu + selected pulls (near the ask) + ask | Ghost's actual loop |

Optional: **B-clean** (dump, no ballast) vs **B-loaded** isolates attention
dilution — same fingerprint, degrading as the window fills.

## Why the corpus is built for this

The fingerprint spans registers that are individually true and mutually
contradictory outside their conditions:

- product ↔ editorial (quiet type vs. 96px display heroes)
- product ↔ email (token discipline vs. mandatory hardcoded hex)
- product ↔ data-density (16px rhythm vs. 4/8px compression)

Dumped whole, the conditions blur and generations average across registers.
Gathered, the agent selects the register the task belongs to.

## Asks (boundary-adjacent by design)

1. "Build a billing settings page" — product ask; editorial scale and email
   hardcoding are the poison.
2. "Build a pricing landing page" — editorial ask; product restraint poisons
   *downward* (timid heroes).
3. "Build a payment-receipt email" — material-level failure mode; `var(--…)`
   in email breaks in clients, mechanically checkable.

## Protocol

The demo is driven by `steering-eval` (`packages/steering-eval`), configured
by `eval.config.json`. `ballast.md` is fixed and identical across arms
(~77K words / ~100K tokens of realistic-shaped, irrelevant session context).
Never edit it between runs.

Per cell (arm × ask), for k = 1..5 — gather runs strictly serialized:

```bash
node ../../steering-eval/cli.mjs prompt <arm> <ask-n> --run <k>
# hand the prompt file to a FRESH agent context; it writes run-<k>.html
# (gather arm: the agent runs `ghost pull` itself mid-task — that IS the test)
node ../../steering-eval/cli.mjs finish <arm> <ask-n> <k>
```

Then, zero LLM calls, rebuildable from `out/` alone:

```bash
node ../../steering-eval/cli.mjs shoot && node ../../steering-eval/cli.mjs score && node ../../steering-eval/cli.mjs report
```

Fairness rules: B's dump goes up front (that is where the naive integration
puts it); C's pulls land after ballast, near the ask (that is how the CLI
is used mid-conversation). Same ballast, same asks, same model, same
temperature everywhere. Report distributions, never single wins.

## Median score

`median-score.mjs` counts measured unsteered-generation tells (from the
antimedian experiment: 300 generations, 3 models, no design context) in any
HTML artifact. Calibration on real data:

- antimedian unsteered pages: mean **9.1/22** (gpt runs up to 15/22)
- vessel-light refs: mean **0.2/22**

Score every arm's artifacts; report the mean per arm alongside `ghost review`
results. Known caveat: the font tells (`inter-font-default`,
`segoe-font-default`) legitimately fire on email artifacts, where the system
stack is mandated by `register.email` — discount them there.

## Files

- `eval.config.json` — the steering-eval configuration (arms, k, corpora)
- `ballast.md` — the fixed context ballast
- `asks.md` — the three asks, plus `expect:`/`poison:`/`discount:` harness
  metadata (stripped before generation; minimal, defensible sets only)
- `run-arm.md` — per-arm assembly instructions for the driving agent
- `median-tells.json` — the distilled tell list with antimedian evidence counts
- `median-score.mjs` — the standalone scorer (steering-eval embeds the same
  tell-matching)
