---
description: Tradeoff behind leading with gather/pull before review — gather when docs positioning could overemphasize drift, checks, gates, or scoring.
materials:
  - apps/docs/src/content/docs/getting-started.mdx
  - apps/docs/src/content/docs/checks-and-review.mdx
  - apps/docs/src/app/tools/scan/page.tsx
  - apps/docs/src/app/tools/drift/page.tsx
---

Decision trace: Ghost could have led with review because drift detection is easy
to understand. We choose feed-forward authoring and recall as the center because
that is the product's real leverage: the agent should receive the decision before
it builds.

What review is good for:

- It makes drift visible after a diff.
- It routes changed files to material-backed nodes and checks.
- It gives a host agent an advisory packet for critique.

Why review does not lead:

- If the right truth was never gathered, review catches the failure late.
- Calling review a gate makes Ghost sound like it judges brand fit
  deterministically, which it does not.
- Teams adopt faster when the first win is one repeated decision written down and
  reused before generation.

The decision reverses only for a page whose explicit job is `ghost review`, the
checks haunt, or CI-style integration. Even there, repeat the boundary: review is
feed-back and advisory; checks do not leak into generation context.
