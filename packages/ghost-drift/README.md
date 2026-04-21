# ghost-drift

**Deterministic design drift detection. Six verbs. No LLM calls.**

`ghost-drift` captures a design language as a human-readable `fingerprint.md` (49-dim embedding + three-layer prose body) and gives any agent the primitives to detect drift against it. Judgement lives in whatever agent you already use; arithmetic lives here.

## Requirements

- Node.js **18+**

## Install

> While `ghost-drift` is being registered on the npm public registry, the package is distributed as a tarball attached to each [GitHub Release](https://github.com/block/ghost/releases). Install directly from the release URL:

```bash
# latest release
npm install https://github.com/block/ghost/releases/download/ghost-drift%400.1.1/ghost-drift-0.1.1.tgz

# pnpm / yarn work the same
pnpm add https://github.com/block/ghost/releases/download/ghost-drift%400.1.1/ghost-drift-0.1.1.tgz
```

Or pin in `package.json`:

```json
{
  "dependencies": {
    "ghost-drift": "https://github.com/block/ghost/releases/download/ghost-drift%400.1.1/ghost-drift-0.1.1.tgz"
  }
}
```

Once npm publishing is unblocked this will move to the registry — swap the URL for a plain `^0.1.1`.

## Use

```bash
ghost-drift lint fingerprint.md                       # validate schema + partition
ghost-drift compare a/fingerprint.md b/fingerprint.md # pairwise distance (N=2)
ghost-drift compare ./*/fingerprint.md                # fleet comparison (N≥3)
ghost-drift ack                                       # acknowledge drift against parent
ghost-drift adopt path/to/new-parent.md               # adopt a new parent baseline
ghost-drift diverge <dimension>                       # declare intentional divergence
ghost-drift emit skill                                # install the agent recipe bundle
ghost-drift emit review-command                       # emit a per-project review slash command
ghost-drift emit context-bundle                       # emit a generation context bundle
```

Zero config for every verb. No API key needed. `OPENAI_API_KEY` / `VOYAGE_API_KEY` are optional and only consumed if you ask for a semantic-enriched embedding via the library.

## As a library

```ts
import {
  parseFingerprint,
  lintFingerprint,
  diffFingerprints,
  compareFingerprints,
} from "ghost-drift";

const { fingerprint } = parseFingerprint(await readFile("fingerprint.md", "utf8"));
const report = lintFingerprint(source);
const distance = compareFingerprints(a, b);
```

All exports are browser-safe except the ones that read from disk (history, sync manifest, parent resolution).

## BYOA — bring your own agent

Ghost ships an [agentskills.io](https://agentskills.io)-compatible skill bundle that teaches your host agent (Claude Code, Codex, Cursor, Goose, …) how to **profile**, **review**, **verify**, **generate**, and **discover**. Install it with:

```bash
ghost-drift emit skill
```

The agent runs the recipes; the CLI runs the arithmetic. The CLI never calls an LLM.

## Full story

See the [project README](https://github.com/block/ghost#readme) for the philosophy, the fingerprint format spec, the fleet/parent-child topology, and the reference design language (Ghost UI).

## License

Apache-2.0
