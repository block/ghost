---
name: promote
description: Promote a human-approved proposal into the Ghost fingerprint.
---

# Promote A Fingerprint Proposal

Use this only when a human has accepted a proposal or explicitly asks to record
the decision.

## Steps

1. Resolve the memory stack for the affected path, then read the proposal from
   the matching `.ghost/proposals/` layer.
2. Choose the target from `proposed_action.target`.
3. For `fingerprint`, update the appropriate root or scoped
   `fingerprint.yml` with the smallest durable principle, situation,
   experience contract, or pattern addition. Use `implementation_vocabulary`
   only for current materials that help agents implement the durable memory.
4. For `checks`, update the appropriate `checks.yml` only with deterministic
   detectors and typed `derives_from` references.
5. For `review_policy`, update only the proposal or review rules in
   `fingerprint.yml`.
6. Mark the proposal with `ghost proposal resolve <id> --path <path> --status accepted` or leave a note if it was superseded.
7. Run `ghost lint --all` and `ghost verify --all` when nested bundles exist.

Canonical promotion should be deliberate. Keep rejected or unresolved ideas in
proposals, not in `fingerprint.yml` or `checks.yml`.
