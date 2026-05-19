---
name: ghost-scan
description: Create, validate, recall, and evolve the repo-local Ghost fingerprint bundle. Use when the user wants to scan a product, create or update .ghost, write resources.yml/map.md/survey.json/patterns.yml/checks.yml/intent.md, validate optional decisions/proposals, derive patterns from survey evidence, brief work from the fingerprint, capture a proposal, or promote approved product-experience memory.
license: Apache-2.0
metadata:
  homepage: https://github.com/block/ghost
  cli: ghost-scan
---

# Ghost Scan — Fingerprint Authoring And Activation

A Ghost fingerprint is the root `.ghost/` bundle, not one prose file:

```text
.ghost/
  resources.yml
  map.md
  survey.json
  patterns.yml
  checks.yml
  intent.md        # optional
  decisions/       # optional ghost.decision/v1
  proposals/       # optional ghost.proposal/v1
```

Ghost Scan creates and maintains this fingerprint. Survey grounds the bundle.
Patterns make composition operational. Checks are deterministic gates. Intent is
optional human-authored or human-approved product direction. Decisions and
proposals are optional product-experience memory.

## CLI Verbs

| Verb | Purpose |
|---|---|
| `ghost-scan init-package [dir] [--with-intent]` | Create a root `.ghost` bundle skeleton. |
| `ghost-scan lint [file-or-dir]` | Validate a full bundle by default, or an individual artifact. |
| `ghost-scan verify [dir] [--root <dir>]` | Validate cross-artifact fidelity: resources, pattern evidence, and check references. |
| `ghost-scan inventory [path]` | Emit raw repo signals for the map recipe. |
| `ghost-scan scan-status [dir] [--include-scopes]` | Report required stages: `resources`, `map`, `survey`, `patterns`. |
| `ghost-scan describe [intent.md]` | Print markdown section ranges. Defaults to `.ghost/intent.md`. |
| `ghost-scan diff <a.md> <b.md>` | Structural diff between direct fingerprint markdown files. |
| `ghost-scan survey <op>` | Survey ops: `merge`, `fix-ids`, `summarize`, `catalog`, `patterns`. |
| `ghost-scan emit <kind>` | Derive static artifacts. Kinds: `review-command`, `context-bundle`, `skill`. |

## Workflows

- Full scan: follow [references/scan.md](references/scan.md).
- Map the repo: follow [references/map.md](references/map.md). Output `.ghost/map.md`.
- Survey design evidence: follow [references/survey.md](references/survey.md). Output `.ghost/survey.json`.
- Derive/codify composition grammar: follow [references/patterns.md](references/patterns.md). Output `.ghost/patterns.yml`.
- Promote deterministic checks: write human-selected gates into `.ghost/checks.yml` using `ghost.checks/v1`.
- Capture human intent only when supplied or approved: write `.ghost/intent.md`.
- Recall product-experience memory: follow [references/recall.md](references/recall.md).
- Shape a pre-generation brief: follow [references/brief.md](references/brief.md).
- Critique generated or changed work: follow [references/critique.md](references/critique.md).
- Capture a candidate memory update: follow [references/capture.md](references/capture.md).
- Promote a human-approved proposal: follow [references/promote.md](references/promote.md).

Drift detection and PR checking live in the sibling `ghost-drift` skill:
`ghost-drift check` is blocking; `ghost-drift review` is advisory.

## Package Rules

- `resources.yml` declares what references define the product.
- `map.md` routes changed files to scopes and examples.
- `survey.json` records observed evidence, counts, and factual composition observations.
- `patterns.yml` names surface types and composition grammar with survey-backed evidence.
- `checks.yml` is the optional deterministic gate layer.
- `intent.md` is optional human authority; never treat AI-generated prose as authoritative until accepted.
- `decisions/*.yml` is optional accepted/rejected product-experience rationale.
- `proposals/*.yml` is optional working memory; never treat proposals as canonical.
- Prefer lintable checks: regex, imports, components, required tokens, and path-scoped patterns.

## Always

- Initialize or target `.ghost/` before authoring.
- Use `ghost-scan survey summarize`, `catalog`, and `patterns` to ground patterns and proposed checks.
- Validate the whole bundle with `ghost-scan lint`.
- Run `ghost-scan verify --root <target>` before declaring the bundle complete.

## Never

- Never describe root-level `fingerprint.md` as canonical.
- Never invent values or composition patterns absent from `survey.json`.
- Never promote subjective composition judgment directly into `checks.yml`; keep it advisory until a deterministic detector exists.
- Never treat `intent.md` as machine-generated truth.
