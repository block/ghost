---
description: MDX documentation article structure — use for guide pages, conceptual docs, CLI docs, authoring docs, and checks/review docs.
materials:
  - apps/docs/src/content/docs/*.mdx
  - apps/docs/src/components/docs/docs-page-layout.tsx
  - apps/docs/src/components/docs/doc-prose.tsx
  - apps/docs/src/mdx-components.tsx
---

This pattern applies when the surface teaches a workflow or model in MDX.

**Bound:**

- The page is organized as `DocSection` rows, not a freeform prose blob. Section
  titles sit in the left column on large screens; the content column carries the
  explanation.
- Each section should answer one job: problem, action, model, validation, or
  caveat. Do not make section titles decorative.
- Code examples are short and runnable-looking. Prefer exact commands over
  pseudo-code; if a command is illustrative, say so in prose.
- Frontmatter carries the route-level promise: title, description, kicker,
  section, order, slug. The visible body should satisfy that promise quickly.
- `Callout` is reserved for adoption shortcuts, beta caveats, warnings, or
  boundaries that change user behavior. It is not a decoration block.
- Long conceptual paragraphs are allowed, but every abstract claim should be
  anchored soon after with a filename, command, or node example.

**Open:**

- A page may start with a first-win shortcut when the full model is too heavy for
  a new user.
- Tables are appropriate for matrices, command summaries, and property
  definitions; lists are better for workflow steps and invariants.
- Exact section order may vary, but the path should move from user's pain to
  concrete action before deep model explanation.

**Refines:** `principle.product-model`, `principle.visual-composition`, and
`voice.docs-language`. If an article explains the schema accurately but does not
make the user's next agent instruction obvious, it has missed the docs product.
