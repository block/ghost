---
name: recall
description: Summarize relevant Ghost fingerprint context for a task.
---

# Recall Fingerprint Context

Use this when the user asks what the fingerprint says, how a product usually
handles a surface, or what constraints matter before work begins.

## Steps

1. Resolve the memory stack for the task path with `ghost stack <path>` when a
   path is known.
2. Read merged `fingerprint.yml` memory broad-to-local.
3. Identify matching topology scopes, surface types, situations, and examples.
4. Select relevant principles, experience contracts, and patterns.
5. Read implementation vocabulary only as current replaceable material.
6. Read merged checks for active deterministic gates.
7. Read decisions from the resolved stack; include only `status: accepted` as
   supplemental rationale.
8. Skim proposals from the stack; include only open proposals as unresolved
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
