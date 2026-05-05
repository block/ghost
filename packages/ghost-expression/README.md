# ghost-expression

**Author the three-stage scan of a project's design language: `map.md` → `survey.json` → `expression.md`. No LLM calls in any verb.**

`ghost-expression` owns the scan files every other Ghost tool reads. A scan has three stages:

| Stage | Artifact | Schema | Authored via | Validated by |
|---|---|---|---|---|
| **Map** | `map.md` | `ghost.map/v2` | `map.md` skill recipe + `ghost-expression inventory` | `ghost-expression lint map.md` |
| **Survey** | `survey.json` | `ghost.survey/v2` | `survey.md` skill recipe + `ghost-expression survey fix-ids` | `ghost-expression lint survey.json` |
| **Express** | `expression.md` | (unversioned) | `profile.md` skill recipe (reads survey evidence) | `ghost-expression lint expression.md` + `ghost-expression verify-profile expression.md survey.json --root .` |

This is a breaking v0 scan migration: `ghost.map/v1` and `ghost.survey/v1` are no longer accepted. Regenerate old scan artifacts through map → survey so `surface_sources` and `ui_surfaces[]` capture implemented UI evidence.

The CLI validates files, verifies that an expression matches its survey, inventories repo signals, runs survey ops (`merge`, `fix-ids`, `summarize`, `catalog`), diffs expressions, reports scan progress, and emits derived artifacts.

The actual writing is done by your host agent using the recipes in this package. The CLI is the checker.

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

# Validation — auto-detects expression.md / map.md / survey.json
ghost-expression lint                                # ./expression.md
ghost-expression lint map.md                         # validates as ghost.map/v2
ghost-expression lint survey.json                    # validates as ghost.survey/v2
ghost-expression lint path/to/file --format json     # machine-readable output
ghost-expression verify-profile expression.md survey.json --root .
                                                      # checks expression values/checks against survey evidence

# Pipeline orchestration — what stage to run next
ghost-expression scan-status                         # checks cwd
ghost-expression scan-status path/to/scan-dir

# Survey ops — deterministic
ghost-expression survey merge a.json b.json -o merged.json
ghost-expression survey fix-ids draft.json -o final.json
ghost-expression survey summarize survey.json
ghost-expression survey catalog survey.json --kind color

# Inspection of expressions
ghost-expression describe                            # section ranges + token estimates
ghost-expression diff a/expression.md b/expression.md  # structural prose-level diff
                                                       # (NOT vector distance — see `ghost-drift compare`)

# Emit derived artifacts
ghost-expression emit review-command                 # → .claude/commands/design-review.md
ghost-expression emit context-bundle                 # → ghost-context/ (SKILL.md + expression.md + prompt.md + tokens.css)
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
  verifyProfile,
} from "ghost-expression";

import {
  catalogSurveyValues,
  lintSurvey,
  mergeSurveys,
  recomputeSurveyIds,
  type Survey,
} from "@ghost/core";

const { expression } = parseExpression(await readFile("expression.md", "utf8"));
const report = lintExpression(source);
const layout = layoutExpression(source);   // section ranges + token estimates
const diff = diffExpressions(a, b);        // structural prose diff
const status = await scanStatus("./scan");  // per-stage state + recommended next
const verify = verifyProfile(source, survey, { root: "." }); // profile fidelity
const catalog = catalogSurveyValues(survey); // derived value enum/spec view
```

All exports are browser-safe except `inventory` (reads from disk).

## BYOA — bring your own agent

Install the skill bundle so your agent can author against the schemas:

```bash
ghost-expression emit skill
```

The bundle ships four recipes:

- **`scan.md`** — meta-recipe orchestrating map → survey → profile end-to-end via `scan-status` checkpoints. Use when the user wants a full scan rather than a specific stage.
- **`map.md`** — write `map.md` from a target's `inventory` output. Stage 1.
- **`survey.md`** — write `survey.json` from a target's source code. Stage 2. Enumerate concrete values, tokens, components, and implemented UI surfaces; do not sample.
- **`profile.md`** — interpret a `survey.json` into `expression.md`. Stage 3. Cannot fabricate values not in the survey; cites survey rows as evidence; validates fidelity with `verify-profile`.

Plus a condensed schema reference (`schema.md`) for the `expression.md` frontmatter and body.

Once installed, ask your agent to "scan this design language end-to-end" or "profile this design language". It will follow the recipes, lint map and survey outputs, then run `lint` and `verify-profile` for the expression.

## Format Docs

See [`docs/expression-format.md`](https://github.com/block/ghost/blob/main/docs/expression-format.md) for the full `expression.md` spec. Runtime comparison derives embeddings from the authored file; there is no sibling embedding file.

The `ghost.survey/v2` schema and `ghost.map/v2` schema both live in `@ghost/core`; the condensed authoring references ship in this package's skill bundle.

## License

Apache-2.0
