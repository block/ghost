---
name: recall
description: Summarize relevant Ghost product-experience memory for a task.
---

# Recall Product-Experience Memory

Use this when the user asks what Ghost remembers, how a product usually handles
a surface, or what constraints matter before work begins.

## Steps

1. Read `.ghost/intent.md` when present.
2. Read `.ghost/map.md` to identify likely scopes and surface types.
3. Read `.ghost/patterns.yml` for matching surface and composition patterns.
4. Read `.ghost/checks.yml` for active or proposed deterministic gates.
5. Read `.ghost/decisions/*.yml`; include only `status: accepted` as canonical.
6. Skim `.ghost/proposals/*.yml` separately as unresolved working memory.

## Output

Return a short, cited recall packet:

- Relevant intent.
- Matching surface patterns.
- Active checks.
- Accepted decisions.
- Open proposals or unresolved tensions.

Do not edit files during recall.
