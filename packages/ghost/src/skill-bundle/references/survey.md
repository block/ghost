---
name: survey
description: Use observed repo facts as optional cache material for fingerprint.yml.
handoffs:
  - label: Author fingerprint patterns
    skill: patterns
    prompt: Interpret observed facts into .ghost/fingerprint.yml patterns
  - label: Capture fingerprint memory
    skill: capture
    prompt: Use observed facts to update .ghost/fingerprint.yml
---

# Recipe: Survey As Optional Inventory

`survey.json` is no longer canonical Ghost memory. Use it only when an existing
workflow or helper command needs a structured inventory of observed values,
tokens, components, or surfaces.

Canonical memory lives in `.ghost/fingerprint.yml`. A survey can suggest what
to inspect, but it does not decide what matters.

## When To Use This

Use an inventory pass when:

- the repo is large and you need a factual starting point
- token/component usage is scattered
- you are migrating an old Ghost bundle
- you need a temporary cache before writing durable memory

Skip it when:

- the project is new and has little product UI
- the human already knows the intended product experience
- the task is to add one small principle, contract, pattern, or check

## Rules

- Record observed facts, not interpretation.
- Keep generated output under `.ghost/cache/` unless a legacy command requires
  `.ghost/survey.json`.
- Promote only useful, durable conclusions into `fingerprint.yml`.
- If observation is incomplete, say so. Recommend a proposal only when the gap
  is durable enough to help future generation or review; otherwise leave it as
  local uncertainty.

## Optional Legacy Helpers

The CLI still includes survey helpers for migration and cache workflows:

```bash
ghost survey summarize .ghost/survey.json
ghost survey catalog .ghost/survey.json
ghost survey patterns .ghost/survey.json
```

Treat their output as draft material. Curate durable judgment into
`principles`, `experience_contracts`, or `patterns`; put current tokens,
components, libraries, or assets into `implementation_vocabulary` only when
they help agents implement the product memory.
