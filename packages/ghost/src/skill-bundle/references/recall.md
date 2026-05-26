---
name: recall
description: Summarize relevant Ghost fingerprint context for a task.
---

# Recall Fingerprint Context

Use this when the user asks what the fingerprint says, how a product usually
handles a surface, or what constraints matter before work begins.

## Steps

1. Read `.ghost/fingerprint.yml`.
2. Identify matching topology scopes, surface types, situations, and examples.
3. Select relevant principles, experience contracts, and patterns.
4. Read implementation vocabulary only as current replaceable material.
5. Read `.ghost/checks.yml` for active deterministic gates.
6. Read `.ghost/decisions/*.yml`; include only `status: accepted` as
   supplemental rationale.
7. Skim `.ghost/proposals/*.yml`; include only open proposals as unresolved
   context.

## Output

Return a short, cited recall packet:

- Relevant situation.
- Product-experience principles.
- Applicable experience contracts.
- Matching patterns.
- Implementation vocabulary.
- Active checks.
- Accepted rationale.
- Open proposals or known gaps.

Do not edit files during recall. If the fingerprint does not cover the task,
say that plainly and suggest the smallest proposal type to record later.
