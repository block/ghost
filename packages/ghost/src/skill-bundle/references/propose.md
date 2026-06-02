---
name: propose
description: Write a candidate ghost.proposal/v1 artifact from a session.
---

# Propose A Fingerprint Update

Use this when a design review, implementation, QA finding, or PM discussion
reveals a product-experience decision that may belong in the Ghost fingerprint.

## Proposal Threshold

Create a proposal only when the observation is durable enough to help a future
agent generate or review work. Good candidates are repeated, high-impact,
explicitly human-stated, intentionally divergent, likely to recur, or blocking
confident future review.

Do not create proposals for isolated implementation details, weak local context,
duplicates of open proposals, issues already fixable from accepted memory,
vague taste concerns, or generic code quality.

## Steps

1. Confirm the observation is about product experience: perceived, used,
   trusted, understood, or safely changed.
2. Resolve the memory stack for the affected path with `ghost stack <path>`.
3. Check whether merged `fingerprint.yml`, active checks, or open proposals
   already cover it.
4. Confirm it meets the Proposal Threshold and is not a duplicate of an open
   proposal.
5. If it is new and thresholded, run `ghost proposal create --path <path> ...`
   so the proposal lands in the nearest applicable scoped bundle.
6. Use schema `ghost.proposal/v1`.
7. Run `ghost lint --all` when nested bundles exist.

## Proposal Shape

```yaml
schema: ghost.proposal/v1
id: saved-payment-empty-state
status: open
kind: missing-memory
title: Saved payment empty state should teach recovery
claim: Empty states for saved payment methods should prioritize recovery over education.
rationale: The user is blocked from paying, not browsing product concepts.
scope:
  roles: [design, pm, qa]
  surface_types: [empty-state]
evidence:
  - path: apps/payments/empty-state.tsx
proposed_action:
  target: fingerprint
  summary: Promote into fingerprint.yml if repeated.
```

Use `missing-memory`, `intentional-divergence`, `experience-gap`, or
`check-candidate`. Do not rewrite `fingerprint.yml` or `checks.yml` without
human approval.
