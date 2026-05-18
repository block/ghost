# ghost-drift

**Deterministic design drift detection. Five verbs. No LLM calls.**

`ghost-drift` checks root Ghost fingerprint bundles, compares bundle-derived design signals, records intent across drift, and ships the agentskills.io recipes a host agent uses to review, verify, and remediate. It pairs with **[`ghost-scan`](../ghost-scan)** — the package that owns authoring `.ghost/`.

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
ghost-drift compare a/.ghost b/.ghost                  # pairwise bundle distance (N=2)
ghost-drift compare ./*/.ghost                         # composite bundle comparison, N≥3
ghost-drift compare a.md b.md --semantic               # direct markdown qualitative diff
ghost-drift compare a.md b.md --temporal               # add velocity / trajectory
ghost-drift review --include-memory                    # include accepted .ghost/decisions in advisory packets
ghost-drift ack                                        # acknowledge drift against the tracked fingerprint
ghost-drift track path/to/new-tracked.fingerprint.md    # track another fingerprint
ghost-drift diverge <dimension>                        # declare intentional divergence
ghost-drift emit skill                                 # install the agent recipe bundle
```

Zero config for every verb. No API key needed. `OPENAI_API_KEY` / `VOYAGE_API_KEY` are optional and only consumed if you ask for semantic-enriched runtime embeddings via the library.

### Authoring a scan?

Scans live in **[`ghost-scan`](../ghost-scan)**, which owns the root bundle pipeline (`resources.yml` → `map.md` → `survey.json` → `patterns.yml`). Install it for `inventory`, `lint`, `verify`, `describe`, `diff`, `survey merge` / `fix-ids` / `summarize` / `catalog` / `patterns`, `scan-status`, and `emit review-command` / `emit context-bundle`:

```bash
ghost-scan inventory                  # raw repo signals → JSON (feeds map.md)
ghost-scan scan-status                # per-stage state + next stage
ghost-scan lint                       # auto-detects .ghost bundle artifacts
ghost-scan verify .ghost --root .     # cross-artifact fidelity gate
ghost-scan survey merge a.json b.json # union with id-based dedup
ghost-scan survey catalog survey.json # derived value enum/spec view
ghost-scan diff a.md b.md             # structural prose-level diff between fingerprints
ghost-scan emit review-command        # per-project slash command
ghost-scan emit context-bundle        # generation context bundle
```

The authoring verbs that used to live under `ghost-drift` were moved in v0.2.0; running them on `ghost-drift` now prints a deprecation message pointing here.

### Product-experience memory

`ghost-drift check` remains deterministic and reads only active `checks.yml`
gates. `ghost-drift review --include-memory` can include accepted
`.ghost/decisions/*.yml` in the advisory packet. Rejected decisions and
`.ghost/proposals/*.yml` are ignored by drift.

## As a library

```ts
import {
  compareFingerprints,
  loadFingerprint,
  readHistory,
  readSyncManifest,
} from "ghost-drift";

const { fingerprint: a } = await loadFingerprint("a/fingerprint.md");
const { fingerprint: b } = await loadFingerprint("b/fingerprint.md");
const distance = compareFingerprints(a, b);
```

Parsing, linting, layout, and diff utilities live in `ghost-scan` (re-exported from there). The shared embedding math lives in `@ghost/core`. All exports are browser-safe except the ones that read from disk (history, sync manifest, tracked-fingerprint resolution).

## BYOA — bring your own agent

Ghost ships per-tool [agentskills.io](https://agentskills.io)-compatible bundles. The `ghost-drift` bundle teaches your host agent (Claude Code, Codex, Cursor, Goose, …) how to **review** drift in a PR, **verify** generated UI, **interpret** comparison output, and **remediate** with `ack` / `track` / `diverge`. Install it with:

```bash
ghost-drift emit skill
```

The agent runs the recipes; the CLI runs the arithmetic. The CLI never calls an LLM.

(Authoring recipes — `scan` / `map` / `survey` / `patterns` — all ship in `ghost-scan`'s skill bundle, since one tool now owns the root bundle pipeline. Fleet narrative recipes ship in `ghost-fleet`.)

## Full story

See the [project README](https://github.com/block/ghost#readme) for the philosophy, the four-tool decomposition, the three-stage scan pipeline, the fingerprint format spec, composite comparison, and the reference design language (Ghost UI).

## License

Apache-2.0
