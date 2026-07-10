---
name: brief
description: Build a compact pre-generation packet from pulled Ghost truths.
---

# Recipe: Brief Work From Ghost Fingerprint

A brief is an ephemeral steering packet for the generating pass. It is not a new
schema and is never written back into `.ghost/`.

1. Run `ghost gather <ask> --format json` and select against descriptions.
2. Pull a small set: **3–5 nodes is normal; 10 is a bad selection** unless the
   task is unusually broad. Always include `index` unless already read this
   session.
3. Prefer concrete nodes: `materials`, substantial fenced examples, or a
   `## Skeleton`. If there is **no concrete material for this surface**, the
   readiness ceiling is **Yellow**.
4. Keep provisional reasoning visibly separate from Ghost-backed claims.

## The packet: five sections only

Return this shape:

```markdown
## Grounded in
- `node.id` — why it was selected

## Non-negotiables
- ≤5 lines, each cited to a node id

## Materials inline
- concrete locators, inlined snippets, inspect-pointers, and what to view/use

## Skeleton
- matching pulled Skeleton, or "none pulled"

## Silent / provisional
- what Ghost does not cover and what local evidence carries
```

Rules:

- Do not add sections for every kind. Sections dilute instruction weight.
- Treat `ghost pull` ordering as signal: stance first, concrete material next,
  prose rules, Skeletons dead last.
- If a pulled Skeleton matches the surface, begin the artifact from it verbatim
  before filling.
- Anti-goals are review-critical: state the positive replacement, not just the
  rejected pattern.
