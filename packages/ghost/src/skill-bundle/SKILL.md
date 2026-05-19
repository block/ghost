---
name: ghost
description: Capture, validate, review, and evolve a repo-local Ghost fingerprint. Use when the user wants to capture a product fingerprint, update .ghost, brief work from accepted product-experience context, review drift, verify generated UI, compare fingerprints, or record accepted divergence.
license: Apache-2.0
metadata:
  homepage: https://github.com/block/ghost
  cli: ghost
---

# Ghost - Product Fingerprints

Ghost captures product identity in a repo-local fingerprint bundle:

```text
.ghost/
  resources.yml
  map.md
  survey.json
  patterns.yml
  checks.yml        # optional deterministic gates
  intent.md         # optional human-approved intent
  decisions/        # optional accepted/rejected rationale
  proposals/        # optional candidate updates
```

Survey grounds the bundle. Patterns make composition operational. Checks are
deterministic gates. Intent and decisions preserve human-approved product
experience context. The host agent reads and writes the fingerprint; the CLI
provides deterministic validation, comparison, routing, and handoff packets.

## CLI Verbs

| Verb | Purpose |
|---|---|
| `ghost init [dir] [--with-intent]` | Create the root `.ghost` bundle skeleton. |
| `ghost scan [dir] [--format json]` | Report fingerprint capture progress and the next BYOA step. |
| `ghost inventory [path]` | Emit raw repo signals for map authoring. |
| `ghost lint [file-or-dir]` | Validate a bundle or individual artifact. |
| `ghost verify [dir] --root <dir>` | Validate resources, pattern evidence, checks, and optional decisions/proposals. |
| `ghost survey <op>` | Survey ops: `merge`, `fix-ids`, `summarize`, `catalog`, `patterns`. |
| `ghost check --base <ref>` | Run active deterministic gates against a diff. |
| `ghost review --base <ref>` | Emit an advisory review packet grounded in bundle evidence. |
| `ghost compare <a> <b> [...more]` | Compare root bundles or direct fingerprints. |
| `ghost ack` / `track` / `diverge` | Record stance toward tracked drift. |
| `ghost emit <kind>` | Emit `review-command` or `context-bundle`. |
| `ghost skill install` | Install this unified skill bundle. |

## Workflows

- Fingerprint Capture: follow [references/capture.md](references/capture.md).
- Map the repo: follow [references/map.md](references/map.md).
- Survey design evidence: follow [references/survey.md](references/survey.md).
- Derive composition grammar: follow [references/patterns.md](references/patterns.md).
- Recall accepted product-experience context: follow [references/recall.md](references/recall.md).
- Shape a pre-generation brief: follow [references/brief.md](references/brief.md).
- Critique generated or changed work: follow [references/critique.md](references/critique.md).
- Review drift: follow [references/review.md](references/review.md).
- Verify generation: follow [references/verify.md](references/verify.md).
- Compare bundles: follow [references/compare.md](references/compare.md).
- Remediate drift: follow [references/remediate.md](references/remediate.md).
- Propose a candidate fingerprint update: follow [references/propose.md](references/propose.md).
- Promote a human-approved proposal: follow [references/promote.md](references/promote.md).

## Always

- Treat `.ghost/` as the source of truth.
- Validate with `ghost lint` and `ghost verify --root <target>` before declaring Fingerprint Capture complete.
- Run `ghost check` for deterministic gates and `ghost review` for advisory critique.
- Include accepted decisions with `ghost review --include-memory` when product-experience rationale matters.

## Never

- Never treat advisory composition judgment as a CI gate.
- Never invent values or composition patterns absent from `survey.json`.
- Never treat `intent.md` as authoritative unless human-authored or human-approved.
- Never treat proposals or rejected decisions as canonical inputs.
