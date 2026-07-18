---
description: Core ghost product model — gather for docs copy, IA, onboarding, diagrams, workflow explanations, or any statement of what ghost is.
materials:
  - README.md
  - packages/ghost/README.md
  - apps/docs/src/app/page.tsx
  - apps/docs/src/content/docs/getting-started.mdx
  - apps/docs/src/content/docs/authoring.mdx
  - apps/docs/src/content/docs/checks-and-review.mdx
  - packages/ghost/src/commands/**
---

ghost gives agents applicable, repo-local brand guidance before they make. The
docs should keep three roles clear:

- **The `.ghost/` package holds the guidance.** It keeps brand decisions and
  concrete materials with the work.
- **The agent authors and uses it.** The agent reads, selects, interprets,
  applies, and judges. ghost is BYOA, not an autonomous designer.
- **The CLI supports the interaction.** It performs repeatable work: scaffold,
  validate, gather the menu, pull selected nodes, summarize local events, and
  assemble review evidence.
- **Guidance before review.** Give the agent applicable guidance before it
  builds. Review is useful after a change exists, but it is not the headline.
- **Flat node corpus.** A ghost package is a flat `.ghost/` package of markdown
  prose nodes. Kinds come from filename prefixes declared in `glossary.md`.
  Altitude lives in prose; narrower guidance names their condition. Do not describe
  folders, inheritance, edge traversal, or schema fields as the conceptual model.
- **Guidance matters through use.** A node helps only when an agent can find it,
  read it, and apply it. Keep descriptions and command examples close to
  abstract claims.
- **Git is the approval boundary.** Uncommitted ghost package edits are drafts;
  checked-in node prose is canonical through normal review.

When the docs must choose between theoretical completeness and a simple first
win, the first win wins. The canonical onboarding story is: write the decision
you keep repeating once, put it in `.ghost/`, gather it before generation, and
review drift after the diff.
