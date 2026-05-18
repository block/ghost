---
name: ghost-memory
description: Activate and capture optional Ghost product-experience memory. Use when a user wants recall, brief shaping, role-aware critique, proposal capture, or promotion guidance from .ghost decisions/proposals.
license: Apache-2.0
metadata:
  homepage: https://github.com/block/ghost
  cli: ghost-memory
---

# Ghost Memory — Product-Experience Companion

Ghost Memory is the optional companion layer around a root Ghost package. It
does not replace `ghost-fingerprint` or `ghost-drift`:

- `ghost-fingerprint` observes and distills `.ghost/`.
- `ghost-drift` judges changed/generated work against accepted memory.
- `ghost-memory` activates memory before work and captures proposals after work.

Read canonical package files first, then optional memory:

```text
.ghost/
  resources.yml
  map.md
  survey.json
  patterns.yml
  checks.yml
  intent.md
  decisions/*.yml
  proposals/*.yml
```

Only accepted decisions are canonical for critique. Proposals are working memory.

## Workflows

- Recall product-experience memory: follow [references/recall.md](references/recall.md).
- Shape a pre-generation brief: follow [references/brief.md](references/brief.md).
- Critique generated or changed work: follow [references/critique.md](references/critique.md).
- Capture a candidate memory update: follow [references/capture.md](references/capture.md).
- Promote a human-approved proposal: follow [references/promote.md](references/promote.md).

## Rules

- Never treat proposals as canonical.
- Never make `ghost-drift check` depend on decisions or proposals.
- Use `ghost-drift review --include-memory` only for advisory critique.
- Keep deterministic gates in `checks.yml`; decisions are rationale and
  advisory memory.
