---
name: ghost-drift
description: Run deterministic Ghost checks, emit advisory review packets, compare profiles, and record drift stance. Use for "check for drift", "review this PR", "verify generated UI", "compare profiles", or "accept this divergence".
license: Apache-2.0
metadata:
  homepage: https://github.com/block/ghost
  cli: ghost-drift
---

# Ghost Drift — Check And Review

Ghost Drift consumes the repo-local fingerprint package:

```text
.ghost/fingerprint/
  map.md
  survey.json
  profile.md
  checks.yml
```

The rule is simple:

- `ghost-drift check` is deterministic and blocking.
- `ghost-drift review` is advisory and evidence-routed.
- `ghost-drift compare` compares profile embeddings.
- `ack`, `track`, and `diverge` record intentional drift.

## CLI Verbs

| Verb | Purpose |
|---|---|
| `ghost-drift check --base <ref>` | Route changed files through `map.md`, apply active `checks.yml`, and exit nonzero on failures. |
| `ghost-drift check --diff <patch> --format json` | Check a saved unified diff and emit stable JSON. |
| `ghost-drift review --base <ref>` | Emit an advisory review prompt packet grounded in profile, survey, checks, and diff. |
| `ghost-drift compare <a.md> <b.md> [...more]` | Pairwise or composite profile distance. |
| `ghost-drift ack` / `track <profile.md>` / `diverge <dim>` | Record stance in `.ghost-sync.json`. |
| `ghost-drift emit skill` | Install this skill bundle. |

## Review Rule

Advisory findings are non-blocking unless tied to an active deterministic check.
Every advisory finding should cite:

- diff location
- profile section
- survey evidence
- precedent/example
- repair

## Workflows

- "Run the gate" → `ghost-drift check --base <ref>`.
- "Review this PR for design drift" → run `ghost-drift check`, then use `ghost-drift review` as the evidence packet for advisory critique.
- "Compare these profiles" → run `ghost-drift compare <a> <b>`, add `--semantic` when the user asks why.
- "Accept this drift" → use `ack`, `track`, or `diverge`.

Authoring `.ghost/fingerprint/` lives in the sibling `ghost-fingerprint` skill.

## Never

- Never treat profile prose as a CI gate.
- Never fail a build on advisory-only judgment.
- Never auto-promote an advisory finding into `checks.yml`; a human must curate deterministic gates.
