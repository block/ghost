# ghost-fingerprint

**Author the three-stage scan of a project's design language: `map.md` → `survey.json` → `fingerprint.md`. No LLM calls in any verb.**

`ghost-fingerprint` owns the scan files every other Ghost tool reads. A scan has three stages:

| Stage | Artifact | Schema | Authored via | Validated by |
|---|---|---|---|---|
| **Map** | `map.md` | `ghost.map/v2` | `map.md` skill recipe + `ghost-fingerprint inventory` | `ghost-fingerprint lint map.md` |
| **Survey** | `survey.json` | `ghost.survey/v2` | `survey.md` skill recipe + `ghost-fingerprint survey fix-ids` | `ghost-fingerprint lint survey.json` |
| **Express** | `fingerprint.md` | (unversioned) | `profile.md` skill recipe (reads survey evidence) | `ghost-fingerprint lint fingerprint.md` + `ghost-fingerprint verify-profile fingerprint.md survey.json --root .` |

This is a breaking v0 scan migration: `ghost.map/v1` and `ghost.survey/v1` are no longer accepted. Regenerate old scan artifacts through map → survey so `surface_sources` and `ui_surfaces[]` capture implemented UI evidence.

The CLI validates files, verifies that a fingerprint matches its survey, inventories repo signals, runs survey ops (`merge`, `fix-ids`, `summarize`, `catalog`), diffs fingerprints, reports scan progress, and emits derived artifacts.

The actual writing is done by your host agent using the recipes in this package. The CLI is the checker.

For drift detection, comparison, and stance recording (`compare`, `ack`, `track`, `diverge`), see **[`ghost-drift`](../ghost-drift)**.

## Requirements

- Node.js **18+**

## Install

> `ghost-fingerprint` is part of the same release as `ghost-drift`. Install from the GitHub release tarball until npm registration is unblocked:

```bash
pnpm add https://github.com/block/ghost/releases/download/ghost-fingerprint%400.0.0/ghost-fingerprint-0.0.0.tgz
```

## Use

```bash
# Topology — emit raw repo signals
ghost-fingerprint inventory                          # signals for cwd
ghost-fingerprint inventory ../other-repo            # signals for another path

# Validation — auto-detects fingerprint.md / map.md / survey.json
ghost-fingerprint lint                                # ./fingerprint.md
ghost-fingerprint lint map.md                         # validates as ghost.map/v2
ghost-fingerprint lint survey.json                    # validates as ghost.survey/v2
ghost-fingerprint lint path/to/file --format json     # machine-readable output
ghost-fingerprint verify-profile fingerprint.md survey.json --root .
                                                      # checks fingerprint values/checks against survey evidence

# Pipeline orchestration — what stage to run next
ghost-fingerprint scan-status                         # checks cwd
ghost-fingerprint scan-status path/to/scan-dir

# Survey ops — deterministic
ghost-fingerprint survey merge a.json b.json -o merged.json
ghost-fingerprint survey fix-ids draft.json -o final.json
ghost-fingerprint survey summarize survey.json
ghost-fingerprint survey catalog survey.json --kind color

# Inspection of fingerprints
ghost-fingerprint describe                            # section ranges + token estimates
ghost-fingerprint diff a/fingerprint.md b/fingerprint.md  # structural prose-level diff
                                                       # (NOT vector distance — see `ghost-drift compare`)

# Emit derived artifacts
ghost-fingerprint emit review-command                 # → .claude/commands/design-review.md
ghost-fingerprint emit context-bundle                 # → ghost-context/ (SKILL.md + fingerprint.md + prompt.md + tokens.css)
ghost-fingerprint emit context-bundle --prompt-only   # single prompt.md
ghost-fingerprint emit skill                          # install the agent recipe bundle
```

Zero config for every verb. No API key needed.

## As a library

```ts
import {
  parseFingerprint,
  lintFingerprint,
  layoutFingerprint,
  diffFingerprints,
  inventory,
  lintMap,
  scanStatus,
  verifyProfile,
} from "ghost-fingerprint";

import {
  catalogSurveyValues,
  lintSurvey,
  mergeSurveys,
  recomputeSurveyIds,
  type Survey,
} from "@ghost/core";

const { fingerprint } = parseFingerprint(await readFile("fingerprint.md", "utf8"));
const report = lintFingerprint(source);
const layout = layoutFingerprint(source);   // section ranges + token estimates
const diff = diffFingerprints(a, b);        // structural prose diff
const status = await scanStatus("./scan");  // per-stage state + recommended next
const verify = verifyProfile(source, survey, { root: "." }); // profile fidelity
const catalog = catalogSurveyValues(survey); // derived value enum/spec view
```

All exports are browser-safe except `inventory` (reads from disk).

## BYOA — bring your own agent

Install the skill bundle so your agent can author against the schemas:

```bash
ghost-fingerprint emit skill
```

The bundle ships four recipes:

- **`scan.md`** — meta-recipe orchestrating map → survey → profile end-to-end via `scan-status` checkpoints. Use when the user wants a full scan rather than a specific stage.
- **`map.md`** — write `map.md` from a target's `inventory` output. Stage 1.
- **`survey.md`** — write `survey.json` from a target's source code. Stage 2. Enumerate concrete values, tokens, components, and implemented UI surfaces; do not sample.
- **`profile.md`** — interpret a `survey.json` into `fingerprint.md`. Stage 3. Cannot fabricate values not in the survey; cites survey rows as evidence; validates fidelity with `verify-profile`.

Plus a condensed schema reference (`schema.md`) for the `fingerprint.md` frontmatter and body.

Once installed, ask your agent to "scan this design language end-to-end" or "profile this design language". It will follow the recipes, lint map and survey outputs, then run `lint` and `verify-profile` for the fingerprint.

## Format Docs

See [`docs/fingerprint-format.md`](https://github.com/block/ghost/blob/main/docs/fingerprint-format.md) for the full `fingerprint.md` spec. Runtime comparison derives embeddings from the authored file; there is no sibling embedding file.

The `ghost.survey/v2` schema and `ghost.map/v2` schema both live in `@ghost/core`; the condensed authoring references ship in this package's skill bundle.

## License

Apache-2.0
