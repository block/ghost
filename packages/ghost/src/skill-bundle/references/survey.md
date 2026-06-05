---
name: survey
description: Use observed repo facts as optional cache material for inventory.yml.
handoffs:
  - label: Author fingerprint patterns
    skill: patterns
    prompt: Interpret observed facts into .ghost/fingerprint/composition.yml patterns
  - label: Update fingerprint layers
    skill: capture
    prompt: Use observed facts to update .ghost/fingerprint/ core layers
---

# Recipe: Survey As Optional Inventory

`survey.json` is no longer canonical Ghost input. Use it only when an existing
workflow or helper command needs a structured inventory of observed values,
tokens, components, or surfaces.

Canonical prose, inventory, and composition live in
`.ghost/fingerprint/{prose.yml,inventory.yml,composition.yml}`. A survey can
suggest what to inspect, but it does not decide what matters.

## When To Use This

Use an inventory pass when:

- the repo is large and you need a factual starting point
- token/component usage is scattered
- you are migrating an old Ghost bundle
- you need temporary source material before writing durable fingerprint layers

Skip it when:

- the project is new and has little product UI
- the human already knows the intended product experience
- the task is to add one small principle, contract, pattern, or check

## Rules

- Record observed facts, not interpretation.
- Keep generated output under `.ghost/fingerprint/sources/cache/` unless a legacy command requires
  `.ghost/survey.json`.
- Promote only useful, durable conclusions into the relevant core layer file.
- If observation is incomplete, say so and leave the gap as local uncertainty
  until the user asks to edit the Ghost package.

## Optional Legacy Helpers

The CLI still includes survey helpers for migration and cache workflows:

```bash
ghost survey summarize .ghost/survey.json
ghost survey catalog .ghost/survey.json
ghost survey patterns .ghost/survey.json
```

Treat their output as draft material. Curate durable judgment into
`prose.principles`, `prose.experience_contracts`, or `composition.patterns`;
put current tokens, components, libraries, assets, routes, files, or notes into
`inventory.building_blocks` only when they help agents implement the product
prose and composition.
