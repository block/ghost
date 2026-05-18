---
name: promote
description: Promote a human-approved proposal into canonical Ghost memory.
---

# Promote A Memory Proposal

Use this only when a human has accepted a proposal or explicitly asks to record
the decision.

## Steps

1. Read the proposal in `.ghost/proposals/`.
2. Choose the target from `proposed_action.target`.
3. For `decisions`, create `.ghost/decisions/<id>.yml` with schema
   `ghost.decision/v1` and `status: accepted`.
4. For `patterns`, update `.ghost/patterns.yml` only when survey evidence
   supports the pattern.
5. For `checks`, update `.ghost/checks.yml` only with deterministic detectors.
6. For `intent`, update `.ghost/intent.md` only with human-approved direction.
7. Mark the proposal `status: accepted` or leave a note if it was superseded.
8. Run `ghost lint .ghost`.

Canonical promotion should be deliberate. Keep rejected or unresolved ideas in
proposals, not in `patterns.yml`, `checks.yml`, or `intent.md`.
