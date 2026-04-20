# Generation Loop

Ghost sits as pipeline infrastructure for AI-driven UI generation. The
`fingerprint.md` is the grounding input; the *review* recipe is the
post-generation gate; the *verify* recipe drives the loop over a prompt
suite to expose where the fingerprint leaks.

Only the grounding step is a deterministic CLI verb (`ghost emit
context-bundle`). *Generate*, *review*, and *verify* are skill recipes
the host agent follows — installed with `ghost emit skill`.

## Pipeline shape

```
fingerprint.md  ──►  [ghost emit context-bundle]  ──►  SKILL.md / tokens.css / prompt.md
                                              │
                                              ▼
                                       any generator
                                  (host agent, Cursor, v0,
                                   in-house tool)
                                              │
                                              ▼ HTML / JSX
                                       [review recipe]  ──►  drift disposition
                                                             (block / annotate
                                                              / ack / adopt)
```

## Pieces

### `ghost emit context-bundle [flags]` — the one CLI verb

Emit a grounding bundle any generator can consume. Default output writes
`SKILL.md` + `fingerprint.md` + `tokens.css` into `./ghost-context/`.

Flags:
- `--out <dir>` — output directory (default: `./ghost-context`)
- `--prompt-only` — single `prompt.md` only; skips `SKILL.md` / `fingerprint.md` / `tokens.css`
- `--no-tokens` — skip `tokens.css`
- `--readme` — include `README.md`
- `--name <name>` — override the skill name (default: fingerprint id)

Point a Claude Code or MCP client at the output directory and the agent
reads `SKILL.md`.

### The `generate` recipe

Driven by the host agent. Loads the fingerprint, builds a system prompt
from Character/Signature/Decisions + tokens, asks the underlying model,
extracts the artifact (HTML/JSX/etc.), and hands it to the `review` recipe
for self-check. Retries with drift feedback until it passes or the agent
gives up.

Not a replacement for Cursor / v0 / in-house tools. It exists so the loop
is provable end-to-end, and so the `verify` recipe has something to drive.

Source: `packages/ghost-cli/src/skill-bundle/references/generate.md`.

### The `review` recipe

The agent diffs generated output against the fingerprint. Flags hardcoded
colors outside the palette, spacing off the scale, and type choices that
violate decisions. For pre-baked, per-project review commands use
`ghost emit review-command` (which writes a slash command at
`.claude/commands/design-review.md`).

Source: `packages/ghost-cli/src/skill-bundle/references/review.md`.

### The `verify` recipe

Runs the generate→review loop over a versioned prompt suite. Aggregates
drift per dimension and classifies:

- **tight** (mean < 1): fingerprint reproduces faithfully
- **leaky** (1–3): generator drifts here often — tighten Decisions
- **uncaptured** (≥ 3): fingerprint likely under-specifies this dimension

The killer demo: run `verify` on a mature fingerprint, intentionally drop
a section (e.g. motion), re-run, watch drift rise in dimensions that lost
grounding.

Source: `packages/ghost-cli/src/skill-bundle/references/verify.md`.

## The standard prompt suite

A versioned set of UI-construction tasks, each tagged with the fingerprint
dimensions it stresses. Tagging prompts with dimensions lets the agent
distinguish *targeted* drift (a pricing-page prompt leaking spacing) from
*incidental* drift (the same prompt leaking color, which it wasn't
supposed to stress).

## How the three-layer fingerprint format earns its keep

Each layer has a concrete job somewhere in the loop:

| Layer | Role in the loop |
|---|---|
| **Character** | Prompt context — shapes feel |
| **Signature** | Drift-sensitive moves the reviewer weights heavily |
| **Decisions** | Lookup table the generator consults for specific choices |

If a layer doesn't pull weight somewhere, that's a signal the format is
over-specified. The `verify` recipe is the schema-discipline mechanism.

## Integration patterns

**CI**: a per-project `design-review` slash command emitted from
`ghost emit review-command`, invoked by the host agent as a required
check on PRs that touch UI files.

**In a generation pipeline**: `ghost emit context-bundle` writes the
skill bundle into the generator's context; the generator produces; the
`review` recipe gates the output. Drift disposition belongs to the
pipeline owner (block, annotate, require `ghost ack`).

**Fingerprint maintenance**: run `verify` periodically. When a dimension
shows up consistently leaky, the fingerprint needs more Decisions for
that dimension.
