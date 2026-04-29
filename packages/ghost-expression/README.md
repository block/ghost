# ghost-expression

**Author the three-stage scan of a project's design language: `map.md` → `bucket.json` → `expression.md`. No LLM calls in any verb.**

`ghost-expression` owns the on-disk artifacts every other Ghost tool reads. A scan runs in three stages, each a separate skill recipe with a deterministic CLI verb as its success gate:

| Stage | Artifact | Schema | Authored via | Validated by |
|---|---|---|---|---|
| **Topology** | `map.md` | `ghost.map/v1` | `map.md` skill recipe + `ghost-expression inventory` | `ghost-expression lint map.md` |
| **Objective** | `bucket.json` | `ghost.bucket/v1` | `survey.md` skill recipe + `ghost-expression bucket fix-ids` | `ghost-expression lint bucket.json` |
| **Subjective** | `expression.md` | (unversioned) | `profile.md` skill recipe (reads bucket as ground truth) | `ghost-expression lint expression.md` |

The CLI parses, lints (auto-detects file kind), inventories raw repo signals, runs deterministic data ops on buckets (`merge`, `fix-ids`), structurally diffs expressions, reports per-stage scan progress, and emits derived artifacts (per-project review slash commands, generation context bundles, agentskills.io skill bundles).

The actual *writing* of each artifact is a host-agent recipe — the four ship in this package's skill bundle and walk an agent through topology / survey / interpretation / end-to-end orchestration. The CLI here is the success gate.

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
# Topology — emit raw repo signals
ghost-expression inventory                          # signals for cwd
ghost-expression inventory ../other-repo            # signals for another path

# Validation — auto-detects expression.md / map.md / bucket.json
ghost-expression lint                                # ./expression.md
ghost-expression lint map.md                         # validates as ghost.map/v1
ghost-expression lint bucket.json                    # validates as ghost.bucket/v1
ghost-expression lint path/to/file --format json     # machine-readable output

# Pipeline orchestration — what stage to run next
ghost-expression scan-status                         # checks cwd
ghost-expression scan-status path/to/scan-dir

# Bucket ops — deterministic
ghost-expression bucket merge a.json b.json -o merged.json
ghost-expression bucket fix-ids draft.json -o final.json

# Inspection of expressions
ghost-expression describe                            # section ranges + token estimates
ghost-expression diff a/expression.md b/expression.md  # structural prose-level diff
                                                       # (NOT vector distance — see `ghost-drift compare`)

# Emit derived artifacts
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
  inventory,
  lintMap,
  scanStatus,
} from "ghost-expression";

import {
  lintBucket,
  mergeBuckets,
  recomputeBucketIds,
  type Bucket,
} from "@ghost/core";

const { expression } = parseExpression(await readFile("expression.md", "utf8"));
const report = lintExpression(source);
const layout = layoutExpression(source);   // section ranges + token estimates
const diff = diffExpressions(a, b);        // structural prose diff
const status = await scanStatus("./scan");  // per-stage state + recommended next
```

All exports are browser-safe except `inventory` (reads from disk).

## BYOA — bring your own agent

Install the skill bundle so your agent can author against the schemas:

```bash
ghost-expression emit skill
```

The bundle ships four recipes:

- **`scan.md`** — meta-recipe orchestrating topology → survey → profile end-to-end via `scan-status` checkpoints. Use when the user wants a full scan rather than a specific stage.
- **`map.md`** — write `map.md` from a target's `inventory` output. Stage 1.
- **`survey.md`** — write `bucket.json` from a target's source code. Stage 2. The load-bearing exhaustiveness rule lives here: enumerate the canonical signal in *this* repo (registry, manifest, named declarations) and cross-check counts; sampling is forbidden.
- **`profile.md`** — interpret a `bucket.json` into `expression.md`. Stage 3. Cannot fabricate values not in the bucket; cites bucket rows as evidence.

Plus a condensed schema reference (`schema.md`) for the `expression.md` frontmatter / body partition.

Once installed, ask your agent to "scan this design language end-to-end" (or just "profile this design language") and it'll follow the recipes, ending each stage at the relevant `lint` invocation as the success gate.

## Canonical artifacts

See [`docs/expression-format.md`](https://github.com/block/ghost/blob/main/docs/expression-format.md) for the full `expression.md` spec, including the 49-dim machine-vector breakdown (palette [0–20], spacing [21–30], typography [31–40], surfaces [41–48]).

The `ghost.bucket/v1` schema and `ghost.map/v1` schema both live in `@ghost/core`; the condensed authoring references ship in this package's skill bundle.

## License

Apache-2.0
