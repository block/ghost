---
description: Tradeoff behind leading with gather/pull before review — gather when docs positioning could overemphasize drift, checks, gates, or scoring.
materials:
  - apps/docs/src/content/docs/getting-started.mdx
  - apps/docs/src/content/docs/checks-and-review.mdx
  - apps/docs/src/content/docs/cli-reference.mdx
---

Decision trace: ghost could have led with review because drift detection is easy
to understand. We lead with authoring, gather, and pull because the agent should
receive the decision before it builds.

What review is good for:

- It makes drift visible after a diff.
- It routes changed files to material-backed nodes and checks.
- It gives the agent grounded evidence for critique.

Why review does not lead:

- If the right guidance was never gathered, review catches the failure late.
- Calling review a gate makes ghost sound like it judges brand fit
  deterministically, which it does not.
- Teams adopt faster when the first win is one repeated decision written down and
  reused before generation.

The decision reverses only for a page whose explicit job is `ghost review`, the
checks directory, or CI-style integration. Even there, repeat the boundary:
review happens after a change exists and remains advisory; checks do not enter
generation context.
