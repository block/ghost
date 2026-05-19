---
name: propose
description: Write a candidate ghost.proposal/v1 artifact from a session.
---

# Propose A Fingerprint Update

Use this when a design review, implementation, QA finding, or PM discussion
reveals a product-experience decision that may belong in the Ghost fingerprint.

## Steps

1. Confirm the observation is about product experience: perceived, used,
   trusted, understood, or safely changed.
2. Check whether accepted decisions, patterns, checks, or intent already cover it.
3. If it is new, write `.ghost/proposals/<slug>.yml`.
4. Use schema `ghost.proposal/v1`.
5. Run `ghost lint .ghost`.

## Proposal Shape

```yaml
schema: ghost.proposal/v1
id: saved-payment-empty-state
status: open
kind: decision
title: Saved payment empty state should teach recovery
claim: Empty states for saved payment methods should prioritize recovery over education.
rationale: The user is blocked from paying, not browsing product concepts.
scope:
  roles: [design, pm, qa]
  surface_types: [empty-state]
evidence:
  - path: apps/payments/empty-state.tsx
proposed_action:
  target: decisions
  summary: Promote into an accepted product-experience decision if repeated.
```

Do not write accepted decisions without human approval.
