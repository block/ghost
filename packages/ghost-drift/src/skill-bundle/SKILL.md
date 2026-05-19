---
name: ghost-drift
description: Run deterministic Ghost checks, emit advisory review packets, compare root fingerprint bundles or direct fingerprint files, and record drift stance. Use for "check for drift", "review this PR", "verify generated UI", "compare fingerprints", or "accept this divergence".
license: Apache-2.0
metadata:
  homepage: https://github.com/block/ghost
  cli: ghost-drift
---

# Ghost Drift — Check And Review

Ghost Drift consumes the repo-local root fingerprint bundle:

```text
.ghost/
  resources.yml
  map.md
  survey.json
  patterns.yml
  checks.yml (optional)
  intent.md (optional)
  decisions/*.yml (optional)
```

The rule is simple:

- `ghost-drift check` is deterministic and blocking.
- `ghost-drift review` is advisory and evidence-routed through patterns and survey evidence.
- `ghost-drift review --include-memory` also includes accepted product-experience decisions.
- `ghost-drift compare` compares root bundles or direct fingerprint markdown files.
- `ack`, `track`, and `diverge` record intentional drift for direct tracked fingerprints.

## CLI Verbs

| Verb | Purpose |
|---|---|
| `ghost-drift check --base <ref>` | Route changed files through `.ghost/map.md`, apply active `.ghost/checks.yml`, and exit nonzero on failures. |
| `ghost-drift check --diff <patch> --format json` | Check a saved unified diff and emit stable JSON. |
| `ghost-drift review --base <ref>` | Emit an advisory review prompt packet grounded in patterns, survey, optional intent, checks, and diff. |
| `ghost-drift review --base <ref> --include-memory` | Add accepted `.ghost/decisions/*.yml` to the advisory packet. |
| `ghost-drift compare <a/.ghost> <b/.ghost> [...more]` | Pairwise or composite distance over root bundles. |
| `ghost-drift compare <a.md> <b.md>` | Compare direct fingerprint markdown files. |
| `ghost-drift ack` / `track <fingerprint.md>` / `diverge <dim>` | Record stance in `.ghost-sync.json` for direct tracked fingerprints. |
| `ghost-drift emit skill` | Install this skill bundle. |

## Review Rule

Advisory findings are non-blocking unless tied to an active deterministic check.
Every advisory finding should cite:

- diff location
- `patterns.yml` composition pattern
- survey evidence
- `intent.md` when relevant
- precedent/example
- repair

## Workflows

- "Run the gate" → `ghost-drift check --base <ref>`.
- "Review this PR for design drift" → run `ghost-drift check`, then use `ghost-drift review` as the evidence packet for advisory critique.
- "Compare these bundles" → run `ghost-drift compare <a/.ghost> <b/.ghost>`.
- "Accept this drift" → use `ack`, `track`, or `diverge` for direct tracked fingerprints.

Authoring `.ghost/` lives in the sibling `ghost-scan` skill.

## Never

- Never treat advisory composition judgment as a CI gate.
- Never fail a build on advisory-only findings.
- Never auto-promote an advisory finding into `checks.yml`; a human must curate deterministic gates.
- Never treat proposals or rejected decisions as canonical drift inputs.
