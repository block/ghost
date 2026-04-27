# ghost-expression

**Author and validate `expression.md` — Ghost's canonical design-language artifact. Four verbs. No LLM calls.**

`ghost-expression` owns the on-disk format every other Ghost tool reads. It parses, lints, lays out (section ranges + token estimates for selective loading), structurally diffs, and emits derived artifacts (per-project review slash commands, generation context bundles, agentskills.io skill bundles).

The actual *writing* of an `expression.md` is a host-agent recipe — `profile.md` ships in this package's skill bundle and walks an agent through resolving design sources end-to-end. The CLI here is the deterministic gate at the end of that loop.

For drift detection, comparison, and stance recording (`compare`, `ack`, `track`, `diverge`), see **[`ghost-drift`](../ghost-drift)**.

## Requirements

- Node.js **18+**

## Install

> `ghost-expression` is part of the same release as `ghost-drift`. Install from the GitHub release tarball until npm registration is unblocked:

```bash
pnpm add https://github.com/block/ghost/releases/download/ghost-expression%400.0.0/ghost-expression-0.0.0.tgz
```

## Use

```bash
ghost-expression lint                                # validate ./expression.md
ghost-expression lint path/to/expression.md          # validate a specific file
ghost-expression lint expression.md --format json    # machine-readable output

ghost-expression describe                            # section ranges + token estimates for ./expression.md
ghost-expression describe expression.md --format json

ghost-expression diff a/expression.md b/expression.md # structural prose-level diff
                                                       # (NOT vector distance — for that, use `ghost-drift compare`)

ghost-expression emit review-command                 # → .claude/commands/design-review.md
ghost-expression emit context-bundle                 # → ghost-context/ (SKILL.md + tokens.css + prompt.md)
ghost-expression emit context-bundle --prompt-only   # single prompt.md
ghost-expression emit skill                          # install the agent recipe bundle
```

Zero config for every verb. No API key needed.

## As a library

```ts
import {
  parseExpression,
  lintExpression,
  layoutExpression,
  diffExpressions,
} from "ghost-expression";

const { expression } = parseExpression(await readFile("expression.md", "utf8"));
const report = lintExpression(source);
const layout = layoutExpression(source);   // section ranges + token estimates
const diff = diffExpressions(a, b);          // structural prose diff
```

All exports are browser-safe.

## BYOA — bring your own agent

Install the skill bundle so your agent can author against the schema:

```bash
ghost-expression emit skill
```

The bundle ships:

- `profile.md` — recipe for writing `expression.md` from a project (mode-branched: `target` / `module` / `rollup`).
- `schema.md` — condensed reference to the frontmatter schema and three-layer body.

Once installed, ask your agent to "profile this design language" and it'll follow the recipe, ending at `ghost-expression lint` for the deterministic success gate.

## Canonical artifact

See [`docs/expression-format.md`](https://github.com/block/ghost/blob/main/docs/expression-format.md) for the full spec, including the 49-dim machine-vector breakdown (palette [0–20], spacing [21–30], typography [31–40], surfaces [41–48]).

## License

Apache-2.0
