---
name: promote
description: Promote a human-approved proposal into the Ghost fingerprint.
---

# Promote A Fingerprint Proposal

Use this only when a human has accepted a proposal or explicitly asks to record
the decision.

## Steps

1. Read the proposal in `.ghost/proposals/`.
2. Choose the target from `proposed_action.target`.
3. For `fingerprint`, update `.ghost/fingerprint.yml` with the smallest
   durable principle, situation, experience contract, pattern, or substrate
   addition.
4. For `checks`, update `.ghost/checks.yml` only with deterministic detectors
   and typed `derives_from` references.
5. For `review_policy`, update only the proposal or review rules in
   `fingerprint.yml`.
7. Mark the proposal `status: accepted` or leave a note if it was superseded.
8. Run `ghost lint .ghost` and `ghost verify .ghost --root <target>`.

Canonical promotion should be deliberate. Keep rejected or unresolved ideas in
proposals, not in `fingerprint.yml` or `checks.yml`.
