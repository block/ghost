# Generation Loop

Ghost gives UI generators a local design-language input and a review loop.
`expression.md` is the file the generator reads. The *review* recipe checks
the result for drift. The *verify* recipe repeats that loop across a prompt
suite to show where the expression needs more detail.

Only the bundle step is a deterministic CLI verb (`ghost-expression
emit context-bundle`). *Review*, *verify*, and *remediate* are skill recipes
the host agent follows — installed with `ghost-drift emit skill`.

Use any generator — the host agent itself, Cursor, v0, or an in-house tool —
with the emitted context bundle in its prompt. Ghost prepares the input and
checks the output; it does not run the generator.

## Pipeline shape

```
expression.md  ──►  [ghost-expression emit context-bundle]  ──►  SKILL.md / expression.md / prompt.md / tokens.css
                                              │
                                              ▼
                                       any generator
                                  (host agent, Cursor, v0,
                                   in-house tool)
                                              │
                                              ▼ HTML / JSX
                                  [review recipe — ghost-drift]  ──►  drift disposition
                                                                       (block / annotate
                                                                        / ack / track)
```

## Pieces

### `ghost-expression emit context-bundle [flags]` — the one CLI verb

Emit a context bundle any generator can consume. Default output writes
`SKILL.md` + `expression.md` + `prompt.md` + `tokens.css` into
`./ghost-context/`. The generated `prompt.md` turns the expression into a
short generation prompt: Character sets feel, Signature describes the final
picture, Local References point to optional source material, Decisions give
style direction, Checks name review gates, and Tokens provide portable values.
It does not ask the generator to explain or cite decisions unless the user asks.

Flags:
- `--out <dir>` — output directory (default: `./ghost-context`)
- `--prompt-only` — single `prompt.md` only; skips `SKILL.md` / `expression.md` / `tokens.css`
- `--no-tokens` — skip `tokens.css`
- `--readme` — include `README.md`
- `--name <name>` — override the skill name (default: expression id)

Point a Claude Code or MCP client at the output directory and the agent
reads `SKILL.md`.

### Driving the generator

The host agent drives this step. It loads the expression (often just the
sections it needs via `ghost-expression describe`), builds a system
prompt from Character + Signature + Local References when accessible +
Decisions + Checks + Tokens, asks the underlying model,
extracts the artifact (HTML/JSX/etc.), and hands it to the `review`
recipe for self-check. Retries with drift feedback until it passes or the
agent gives up.

This isn't a recipe Ghost ships — `generate.md` was dropped. The agent's
own driver code (or whatever generator it shells out to) owns this step.
Ghost's job is the bundle that goes in and the review that checks the output.

### The `review` recipe

The agent diffs generated output against the expression. Flags hardcoded
colors outside the palette, spacing off the scale, and type choices that
violate decisions. For pre-baked, per-project review commands use
`ghost-expression emit review-command` (which writes a slash command at
`.claude/commands/design-review.md`).

Source: `packages/ghost-drift/src/skill-bundle/references/review.md`.

### The `verify` recipe

Runs the generate→review loop over a versioned prompt suite. Aggregates
drift per dimension and classifies:

- **tight** (mean < 1): expression reproduces faithfully
- **leaky** (1–3): generator drifts here often — tighten Decisions
- **uncaptured** (≥ 3): expression likely under-specifies this dimension

A useful test: run `verify` on a mature expression, remove one section
(for example, motion), then run it again. Drift should rise in the dimension
that lost guidance.

Source: `packages/ghost-drift/src/skill-bundle/references/verify.md`.

### The `remediate` recipe

Once `review` flags drift, `remediate` walks the agent through the smallest
correction that lands the output back inside the expression. The output is
either a fix proposal (the agent applies it) or — when the drift turns out
to be intentional — a recommendation to record stance with `ghost-drift ack`
or `ghost-drift diverge` instead of correcting the code.

Source: `packages/ghost-drift/src/skill-bundle/references/remediate.md`.

## The standard prompt suite

A versioned set of UI-construction tasks, each tagged with the expression
dimensions it stresses. Tagging prompts with dimensions lets the agent
distinguish *targeted* drift (a pricing-page prompt leaking spacing) from
*incidental* drift (the same prompt leaking color, which it wasn't
supposed to stress).

## Why Each Section Exists

Each layer has a concrete job somewhere in the loop:

| Layer | Role in the loop |
|---|---|
| **Character** | Prompt context — shapes feel |
| **Signature** | Final-picture guidance — dominant moves and output shape |
| **References** | Local provenance / optional source material; use when accessible |
| **Checks** | Human-promoted drift gates; presence-floor checks codify important absences |
| **Decisions** | Pattern guidance the generator consults for specific choices |

Expression filter: include a fact in `expression.md` only when it can change
generated UI or a drift verdict. `survey.json` can stay broad as evidence —
including implemented `ui_surfaces[]` specimens and their observed composition
signals — while `expression.md` stays compact.

If a section does not affect generation or review, the format is probably too
large. The `verify` recipe is how you notice that.

## Integration patterns

**CI**: a per-project `design-review` slash command emitted from
`ghost-expression emit review-command`, invoked by the host agent as a
required check on PRs that touch UI files.

**In a generation pipeline**: `ghost-expression emit context-bundle` writes
the skill bundle into the generator's context; the generator produces; the
`review` recipe checks the output. Drift disposition belongs to the pipeline
owner (block, annotate, require `ghost-drift ack`).

**Expression maintenance**: run `verify` periodically. When a dimension
shows up consistently leaky, the expression needs more Decisions for
that dimension.
