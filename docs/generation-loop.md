# Generation Loop

Ghost sits as pipeline infrastructure for AI-driven UI generation. The
`expression.md` is the grounding input; `ghost review` is the post-generation
gate. The three new commands wire it together.

## Pipeline shape

```
expression.md  ──►  [ghost context]  ──►  SKILL.md / tokens.css / prompt.md
                                              │
                                              ▼
                                       any generator
                                   (ghost generate, Cursor,
                                    v0, in-house tool)
                                              │
                                              ▼ HTML / JSX
                                       [ghost review]  ──►  drift disposition
                                                            (block / annotate
                                                             / ack / adopt)
```

## Commands

### `ghost context [expression] --format skill|prompt|bundle`

Emit a grounding bundle any generator can consume.

- `skill` — `SKILL.md` + `expression.md` (user-invocable Agent Skill)
- `prompt` — single `prompt.md` combining Character, Signature, Decisions,
  Values, and a token table. For generators that accept a plain text prompt.
- `bundle` — `SKILL.md` + `expression.md` + `tokens.css` + `README.md` (full
  kit, Arcade-style)

Defaults to `skill`. Point a Claude Code or MCP client at the output directory
and the agent reads `SKILL.md`.

### `ghost generate <prompt> --expression <path>`

Reference generator. Loads the expression, builds a system prompt from
Character/Signature/Decisions/Values + tokens, calls the LLM, extracts HTML,
and (by default) runs `ghost review` against its own output. If `errors > 0`,
it injects drift feedback and retries. Hard-capped to 3 retries.

Not meant to compete with Cursor / v0 / in-house tools. It exists so the loop
is provable end-to-end, and so `ghost verify` has something to drive.

Flags:
- `--no-review` — skip self-review (drift-blind, fast)
- `--retries <n>` — max retries, default 2, capped at 3
- `--json` — structured output with per-attempt drift counts

### `ghost verify [expression] --n <count>`

Run the generate→review loop over a versioned prompt suite (bundled v0.1,
~18 prompts). Aggregates drift per dimension and classifies:

- **tight** (mean < 1): expression reproduces faithfully
- **leaky** (1–3): generator drifts here often — tighten Decisions or Values
- **uncaptured** (≥ 3): expression likely under-specifies this dimension

Output is a per-dimension report plus actionable recommendations. The killer
demo: run `verify` on a mature expression, intentionally drop a section (e.g.
motion), re-verify, watch drift rise in dimensions that lost grounding.

## The standard prompt suite

Versioned JSON of UI-construction tasks, each tagged with the fingerprint
dimensions it stresses. Bundled inside core (see
`packages/ghost-core/src/verify/suite-v0.1.json`), also available as a runtime
TS constant (`BUNDLED_SUITE`) so it ships with compiled output.

Tagging prompts with dimensions means we can distinguish *targeted* drift
(a pricing-page prompt leaking spacing) from *incidental* drift (the same
prompt leaking color, which it wasn't supposed to stress).

## How the three-layer expression format earns its keep

Each layer has a concrete job somewhere in the loop:

| Layer | Role in the loop |
|---|---|
| **Character** | Prompt context — shapes feel |
| **Signature** | Numeric signal in review and verify |
| **Decisions** | Lookup table the generator consults for specific choices |
| **Values** | Hard gates in post-generation review (Do/Don't) |

If a layer doesn't pull weight somewhere, that's a signal the format is
over-specified. Verify is the schema-discipline mechanism.

## Integration patterns

**CI**: `ghost review --against expression.md` as a required check on PRs
that touch UI files.

**In a generation pipeline**: `ghost context` emits the skill bundle into the
generator's context; the generator produces; `ghost review` gates the output.
Drift disposition belongs to the pipeline owner (block, annotate,
require `ghost ack`).

**Expression maintenance**: run `ghost verify` periodically. When a dimension
shows up consistently leaky, the expression needs more Decisions or Values
rules for that dimension.
