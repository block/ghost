# ghost-drift

**Deterministic design drift detection. Five verbs. No LLM calls.**

`ghost-drift` compares design-language expressions, records intent across drift, and ships the agentskills.io recipes a host agent uses to review, verify, and remediate. It pairs with **[`ghost-expression`](../ghost-expression)** — the package that owns authoring `expression.md` (the canonical 49-dim embedding + three-layer prose artifact this tool consumes).

## Requirements

- Node.js **18+**

## Install

> While `ghost-drift` is being registered on the npm public registry, the package is distributed as a tarball attached to each [GitHub Release](https://github.com/block/ghost/releases). Install directly from the release URL:

```bash
# latest release
npm install https://github.com/block/ghost/releases/download/ghost-drift%400.2.0/ghost-drift-0.2.0.tgz

# pnpm / yarn work the same
pnpm add https://github.com/block/ghost/releases/download/ghost-drift%400.2.0/ghost-drift-0.2.0.tgz
```

Or pin in `package.json`:

```json
{
  "dependencies": {
    "ghost-drift": "https://github.com/block/ghost/releases/download/ghost-drift%400.2.0/ghost-drift-0.2.0.tgz"
  }
}
```

Once npm publishing is unblocked this will move to the registry — swap the URL for a plain `^0.2.0`.

## Use

```bash
ghost-drift compare a/expression.md b/expression.md   # pairwise distance (N=2)
ghost-drift compare ./*/expression.md                  # composite, N≥3
ghost-drift compare a.md b.md --semantic               # add qualitative diff
ghost-drift compare a.md b.md --temporal               # add velocity / trajectory
ghost-drift ack                                        # acknowledge drift against the tracked expression
ghost-drift track path/to/new-tracked.expression.md    # track another expression
ghost-drift diverge <dimension>                        # declare intentional divergence
ghost-drift emit skill                                 # install the agent recipe bundle
```

Zero config for every verb. No API key needed. `OPENAI_API_KEY` / `VOYAGE_API_KEY` are optional and only consumed if you ask for a semantic-enriched embedding via the library.

### Authoring `expression.md`?

Authoring lives in **[`ghost-expression`](../ghost-expression)**. Install it for `lint`, `describe`, `diff`, and `emit review-command` / `emit context-bundle`:

```bash
ghost-expression lint                       # validate ./expression.md
ghost-expression describe                   # section ranges + token estimates
ghost-expression diff a.md b.md             # structural prose-level diff
ghost-expression emit review-command        # per-project slash command
ghost-expression emit context-bundle        # generation context bundle
```

These verbs used to live under `ghost-drift`. They were moved in v0.2.0 — running them on `ghost-drift` now prints a deprecation message pointing here.

## As a library

```ts
import {
  compareExpressions,
  loadExpression,
  readHistory,
  readSyncManifest,
} from "ghost-drift";

const { expression: a } = await loadExpression("a/expression.md");
const { expression: b } = await loadExpression("b/expression.md");
const distance = compareExpressions(a, b);
```

Parsing, linting, layout, and diff utilities live in `ghost-expression` (re-exported from there). The shared embedding math lives in `@ghost/core`. All exports are browser-safe except the ones that read from disk (history, sync manifest, tracked-expression resolution).

## BYOA — bring your own agent

Ghost ships per-tool [agentskills.io](https://agentskills.io)-compatible bundles. The `ghost-drift` bundle teaches your host agent (Claude Code, Codex, Cursor, Goose, …) how to **review** drift in a PR, **verify** generated UI, **interpret** comparison output, and **remediate** with `ack` / `track` / `diverge`. Install it with:

```bash
ghost-drift emit skill
```

The agent runs the recipes; the CLI runs the arithmetic. The CLI never calls an LLM.

(Authoring recipes — `profile` for `expression.md` — ship in `ghost-expression`'s skill bundle. Topology and fleet recipes ship in `ghost-map` and `ghost-fleet` respectively.)

## Full story

See the [project README](https://github.com/block/ghost#readme) for the philosophy, the five-tool decomposition, the expression format spec, composite comparison, and the reference design language (Ghost UI).

## License

Apache-2.0
